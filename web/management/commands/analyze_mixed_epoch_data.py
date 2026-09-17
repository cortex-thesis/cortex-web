import base64
import csv
import io
import json
from collections import Counter
from html import escape
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score, davies_bouldin_score, calinski_harabasz_score
from sklearn.preprocessing import StandardScaler

from web.management.commands.train_mixed_epoch_model import FEATURES


def table(headers, rows):
    return '<div class="tableWrap"><table><thead><tr>' + ''.join(f'<th>{escape(str(h))}</th>' for h in headers) + '</tr></thead><tbody>' + ''.join('<tr>' + ''.join(f'<td>{escape(str(v))}</td>' for v in row) + '</tr>' for row in rows) + '</tbody></table></div>'


def chart(figure, caption):
    buffer = io.BytesIO(); figure.savefig(buffer, format='png', dpi=130, bbox_inches='tight'); plt.close(figure)
    return f'<figure><img src="data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}"><figcaption>{escape(caption)}</figcaption></figure>'


def build_report(output):
    with (output / 'epochs.csv').open(encoding='utf-8') as stream:
        rows = list(csv.DictReader(stream))
    report = json.loads((output / 'metrics.json').read_text(encoding='utf-8'))
    x = np.asarray([[float(row[name]) for name in FEATURES] for row in rows])
    source = np.asarray([row['source'] for row in rows]); split = np.asarray([row['split'] for row in rows]); labels = np.asarray([row['condition'] for row in rows])
    real = source == 'real'; train = split == 'train'; classes = report['combined_test']['labels']
    palette = ['#6956b8', '#178b70', '#d78129', '#bb5576']
    plt.rcParams.update({'font.size': 10, 'axes.spines.top': False, 'axes.spines.right': False})
    sections = []
    def section(title, content):
        sections.append(f'<section><h2>{escape(title)}</h2>{content}</section>')

    counts = Counter((row['source'], row['split'], row['condition']) for row in rows)
    section('1. Dataset composition and provenance', '<p>Augmented rows are correlated variations of real source epochs, not additional recordings or participants.</p>' + table(['State', 'Real train', 'Real test', 'Augmented train', 'Augmented test'], [[label, *[counts[(s, p, label)] for s, p in [('real','train'),('real','test'),('augmented','train'),('augmented','test')]]] for label in classes]))
    figure, axes = plt.subplots(1, 2, figsize=(12, 4))
    for axis, mask, title in zip(axes, [real, ~real], ['Real epochs', 'Augmented epochs']):
        axis.bar(classes, [int(np.sum(mask & (labels == label))) for label in classes], color=palette); axis.set_title(title); axis.set_ylabel('Rows'); axis.tick_params(axis='x', rotation=20)
    sections[-1] += chart(figure, 'Compare class balance separately; the augmented count is not an independent sample-size increase.')
    participants = sorted({row['participant_code'] for row in rows})
    section('2. Participants and session coverage', table(['Participant', *classes], [[p, *[sum(row['source']=='real' and row['participant_code']==p and row['condition']==label for row in rows) for label in classes]] for p in participants]))
    train_participants = {r['participant_code'] for r in rows if r['split']=='train'}; test_participants = {r['participant_code'] for r in rows if r['split']=='test'}
    train_recordings = {r['recording_id'] for r in rows if r['split']=='train'}; test_recordings = {r['recording_id'] for r in rows if r['split']=='test'}
    parent_train = {r['source_epoch_id'] for r in rows if r['split']=='train'}; parent_test = {r['source_epoch_id'] for r in rows if r['split']=='test'}
    section('3. Split audit and data checks', table(['Check', 'Value'], [
        ['Train/test source-epoch overlap', len(parent_train & parent_test)], ['Shared participants', len(train_participants & test_participants)],
        ['Shared recording sessions', len(train_recordings & test_recordings)], ['Distinct source epochs', len(parent_train | parent_test)],
        ['Non-finite feature cells', int(np.sum(~np.isfinite(x)))], ['Exact duplicate real feature vectors', len(x[real])-len(np.unique(x[real], axis=0))],
        ['Independent real test epochs', int(np.sum(real & ~train))],
    ]) + '<p>Source-epoch overlap should be zero. Shared participants/sessions mean the experiment does not estimate generalization to unseen people. Age, sex and raw channel traces are not present in this export and are not reconstructed or invented here.</p>')

    summary = []
    for name_index, name in enumerate(FEATURES):
        for kind, mask in [('real',real),('augmented',~real)]:
            values = x[mask,name_index]
            summary.append([name, kind, len(values), *[f'{v:.5g}' for v in [np.mean(values), np.std(values,ddof=1), np.var(values,ddof=1), np.min(values), *np.quantile(values,[.25,.5,.75]), np.max(values)]]])
    section('4. Descriptive statistics', table(['Feature','Source','N','Mean','SD','Variance','Min','Q1','Median','Q3','Max'], summary))
    figure, axes = plt.subplots(2, 3, figsize=(14, 8))
    for index, name in enumerate(FEATURES):
        axis = axes.flat[index]; axis.hist(x[real,index], bins=20, density=True, alpha=.55, label='real', color='#6956b8'); axis.hist(x[~real,index], bins=30, density=True, alpha=.4, label='augmented', color='#178b70'); axis.set_title(name); axis.legend()
    axes.flat[-1].axis('off')
    section('5. Real versus augmented distributions', chart(figure, 'Density-normalized histograms allow comparison despite very different row counts. The first four features are log10 powers; TBR uses linear theta/beta power.'))
    figure, axes = plt.subplots(2, 3, figsize=(14, 8))
    for index, name in enumerate(FEATURES):
        axis = axes.flat[index]; axis.boxplot([x[real & (labels==label), index] for label in classes], tick_labels=classes, showfliers=True); axis.set_title(name); axis.tick_params(axis='x',rotation=20)
    axes.flat[-1].axis('off')
    section('6. Feature separation by state (real data only)', chart(figure, 'Real-only boxplots prevent the augmented copies from visually exaggerating evidence for state separation.'))
    figure, axis = plt.subplots(figsize=(8,6)); correlation = np.corrcoef(x[real],rowvar=False); image=axis.imshow(correlation,vmin=-1,vmax=1,cmap='coolwarm'); figure.colorbar(image, ax=axis)
    axis.set_xticks(range(5), FEATURES, rotation=30,ha='right'); axis.set_yticks(range(5),FEATURES)
    for i in range(5):
        for j in range(5): axis.text(j,i,f'{correlation[i,j]:.2f}',ha='center',va='center')
    section('7. Feature correlations', chart(figure, 'Pearson correlations calculated from real epochs only. TBR is mathematically dependent on theta and beta, not an independent measurement.'))

    real_train = real & train
    scaler = StandardScaler().fit(x[real_train]); standardized = scaler.transform(x)
    pca = PCA(n_components=2).fit(standardized[real_train]); coordinates=pca.transform(standardized)
    figure, axes=plt.subplots(1,2,figsize=(12,5))
    for label,color in zip(classes,palette):
        mask=real & (labels==label); axes[0].scatter(coordinates[mask,0],coordinates[mask,1],s=25,alpha=.8,label=label,color=color)
    axes[0].legend(); axes[0].set_title('Real epochs by recording condition')
    kmeans=KMeans(n_clusters=4,n_init=20,random_state=2026).fit(standardized[real_train]); clusters=kmeans.predict(standardized)
    for cluster,color in zip(range(4),palette):
        mask=real & (clusters==cluster); axes[1].scatter(coordinates[mask,0],coordinates[mask,1],s=25,color=color,label=f'Cluster {cluster}')
    axes[1].legend(); axes[1].set_title('Real epochs by exploratory cluster')
    for axis in axes: axis.set_xlabel('Principal component 1'); axis.set_ylabel('Principal component 2')
    section('8. PCA and exploratory clustering', chart(figure, f'PCA and K-Means fit on real training epochs only. Two-component explained variance: {sum(pca.explained_variance_ratio_):.1%}. Cluster numbers do not automatically represent cognitive-state names. This diagnostic does not alter the saved classifier.'))
    sweep=[]
    for k in range(2,min(9,int(np.sum(real_train)))):
        candidate=KMeans(n_clusters=k,n_init=20,random_state=2026).fit(standardized[real_train]); z=standardized[real_train]; ids=candidate.labels_
        sweep.append([k,candidate.inertia_,silhouette_score(z,ids),davies_bouldin_score(z,ids),calinski_harabasz_score(z,ids)])
    figure,axes=plt.subplots(1,2,figsize=(12,4)); axes[0].plot([r[0] for r in sweep],[r[1] for r in sweep],marker='o'); axes[0].set_title('Elbow / inertia'); axes[1].plot([r[0] for r in sweep],[r[2] for r in sweep],marker='o',color='#178b70'); axes[1].set_title('Silhouette score')
    for axis in axes: axis.set_xlabel('Number of clusters')
    section('9. Cluster-count exploration', chart(figure,'Training-only diagnostics: lower inertia and Davies-Bouldin are better; higher silhouette and Calinski-Harabasz are better. None proves that clusters are the intended cognitive states.') + table(['k','Inertia','Silhouette','Davies-Bouldin','Calinski-Harabasz'], [[r[0],*[f'{v:.4f}' for v in r[1:]]] for r in sweep]))

    section('10. Classification evaluation', table(['Test subset','Rows','Accuracy','Balanced accuracy','Macro precision','Macro recall','Macro F1'], [[key.replace('_',' '),report[key]['rows'],f"{report[key]['accuracy']:.2%}",f"{report[key]['balanced_accuracy']:.2%}",*[f"{report[key]['per_class']['macro avg'][metric]:.2%}" for metric in ['precision','recall','f1-score']]] for key in ['combined_test','real_test','augmented_test']]))
    for key in ['combined_test','real_test','augmented_test']:
        result=report[key]; figure,axes=plt.subplots(1,2,figsize=(12,4)); matrix=np.asarray(result['confusion_matrix']); normalized=matrix / np.maximum(matrix.sum(axis=1,keepdims=True),1)
        for axis,values,title in zip(axes,[matrix,normalized],['Counts','Row-normalized recall']):
            axis.imshow(values,cmap='Purples'); axis.set_xticks(range(4),classes,rotation=20); axis.set_yticks(range(4),classes); axis.set_title(title); axis.set_xlabel('Predicted'); axis.set_ylabel('Actual')
            for i in range(4):
                for j in range(4): axis.text(j,i,str(matrix[i,j]) if title=='Counts' else f'{values[i,j]:.0%}',ha='center',va='center')
        section(f'{key.replace("_"," ")} confusion matrices',chart(figure,'Rows are actual recording-condition labels; columns are classifier predictions.') + table(['State','Precision','Recall','F1','Support'],[[label,*[f"{result['per_class'][label][metric]:.2%}" for metric in ['precision','recall','f1-score']],int(result['per_class'][label]['support'])] for label in classes]))
    section('11. Interpretation and reproducibility', '<ul><li>All 1,300 augmented rows inherit labels from their source epoch. Label preservation under jitter is an assumption, not verified physiology.</li><li>The test rows represent only 19 independent source epochs. Do not treat 279 correlated test rows as 279 independent observations.</li><li>Clustering plots and EDA do not tune the classifier or modify the fixed split.</li><li>Do not use test results to repeatedly choose augmentation strength or model parameters and then report the same test as independent validation.</li><li>Seeds: split/training 2026; test augmentation 2027. Gaussian jitter SD: 0.03 log10-power units.</li><li>Gamma currently spans 30–45 Hz in the raw extractor; alignment with the paper’s 30–40 Hz definition is still required.</li></ul><details><summary>Complete evaluation metadata</summary><pre>'+escape(json.dumps(report,indent=2))+'</pre></details>')
    page='<!doctype html><html><head><meta charset="utf-8"><title>Cortex mixed EEG exploratory analysis</title><style>body{font:15px Arial;background:#f7f4ed;color:#322552;margin:0}main{max-width:1250px;margin:auto;padding:30px}section{background:white;border:1px solid #ddd7eb;border-radius:15px;padding:22px;margin:18px 0}h1,h2{color:#493483}.warning{background:#fff1d6;padding:18px;border-radius:12px;line-height:1.6}img{max-width:100%;height:auto}figure{margin:15px 0}figcaption{color:#655e77;font-size:13px;line-height:1.5}.tableWrap,pre{overflow:auto}table{border-collapse:collapse;width:100%;font-size:13px}th,td{padding:10px;border-bottom:1px solid #ece8f1;text-align:left;white-space:nowrap}th{background:#f3f0f8}li{margin:10px 0;line-height:1.5}summary{cursor:pointer}pre{font-size:12px}</style></head><body><main><h1>Cortex mixed EEG exploratory analysis</h1><p>Real recordings plus clearly identified augmented feature rows</p><div class="warning">'+escape(report['warning'])+'</div>'+''.join(sections)+'</main></body></html>'
    (output/'analysis.html').write_text(page,encoding='utf-8')


class Command(BaseCommand):
    help='Expand the mixed EEG EDA report from existing CSV/metrics without querying Supabase or retraining.'
    def handle(self,*args,**options):
        output=Path(getattr(settings, 'MODEL_ARTIFACT_ROOT', settings.BASE_DIR / 'model-artifacts'))/'mixed-1395'
        if not (output/'epochs.csv').exists() or not (output/'metrics.json').exists():
            raise CommandError('Run train_mixed_epoch_model first.')
        build_report(output)
        self.stdout.write(self.style.SUCCESS(f'Report: {(output/"analysis.html").resolve()}'))
