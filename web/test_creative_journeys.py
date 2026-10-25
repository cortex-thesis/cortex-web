import json
from pathlib import Path
from io import StringIO
from copy import deepcopy
from django.test import TestCase, SimpleTestCase
from django.contrib.auth.models import User
from django.core.management import call_command
from web.activity_templates import validate_activity_configuration
from web.game_validation import evaluate_game
from web.models import Activity, ActivityResponse, AuditLog, CurriculumPackage, Enrollment, LearningSession, Lesson, LessonPracticeProgress, Profile, SchoolClass, Slide

DEFINITIONS = json.loads((Path(__file__).parent / 'creative_lessons.json').read_text())

class CreativeContracts(SimpleTestCase):
    def test_six_eight_slide_journeys_have_valid_contracts_and_official_metadata(self):
        self.assertEqual(len(DEFINITIONS), 6)
        for lesson in DEFINITIONS:
            self.assertLessEqual(len(lesson['slides']), 8)
            self.assertEqual(sum(s['type'] == 'video' for s in lesson['slides']), 1)
            for s in lesson['slides']: self.assertIsNone(validate_activity_configuration(s['type'], s['configuration']), s['title'])
        self.assertEqual([l['competency_code'] for l in DEFINITIONS[3:]], ['TPEP-dt-NG-2', 'TPEP-mu-NG-2', 'TPEP-dc-NG-4'])
        self.assertEqual([l['source']['page'] for l in DEFINITIONS[3:]], [71, 72, 74])

    def config(self, mode): return next(s['configuration'] for l in DEFINITIONS for s in l['slides'] if s['configuration'].get('experience', {}).get('mode') == mode)
    def response(self, config, **value): return json.dumps({'version':config['content_version'], **value})
    def test_composition_is_validated_not_graded_for_quality(self):
        c=self.config('beat')
        self.assertTrue(evaluate_game(c,self.response(c,grid=[[True,False,True,False],[False,True,False,True]],tempo=80)))
        self.assertFalse(evaluate_game(c,self.response(c,grid=[[1]*4,[False]*4],tempo=80)))
        self.assertFalse(evaluate_game(c,self.response(c,grid=[[False]*4]*2,tempo=80)))
        self.assertTrue(evaluate_game(c,self.response(c,grid=[[False]*4]*2,tempo=80,rest=True)))
        self.assertIs(c['scored'],False)
    def test_editable_art_rejects_invalid_objects(self):
        c=self.config('art');obj={'id':1,'shape':'circle','color':'#534ab7','x':2,'y':1}
        self.assertTrue(evaluate_game(c,self.response(c,objects=[obj],background='paper')))
        self.assertFalse(evaluate_game(c,self.response(c,objects=[dict(obj,x=100)],background='paper')))
        self.assertTrue(evaluate_game(c,self.response(c,objects=[],background='paper',blank=True)))
    def test_story_validates_real_path_including_repair(self):
        c=self.config('story')
        self.assertTrue(evaluate_game(c,self.response(c,path=[{'scene':'start','choice':'leave'},{'scene':'alone','choice':'repair'}])))
        self.assertFalse(evaluate_game(c,self.response(c,path=[{'scene':'start','choice':'leave'}])))
        self.assertFalse(evaluate_game(c,self.response(c,path=[{'scene':'alone','choice':'repair'}])))
    def test_reflection_and_sequencing_do_not_claim_movement_verification(self):
        c=self.config('collection');picks={r['id']:['unsure'] for r in c['experience']['categories']}
        self.assertTrue(evaluate_game(c,self.response(c,selections=picks)))
        picks[next(iter(picks))]=['unsure','help']
        self.assertFalse(evaluate_game(c,self.response(c,selections=picks)))
        c=self.config('movement')
        self.assertTrue(evaluate_game(c,self.response(c,order=['tap','clap','pause'],route='point')))
        self.assertFalse(evaluate_game(c,self.response(c,order=['invented']*3,route='point')))

class CreativePublication(TestCase):
    def setUp(self):
        self.admin=Profile.objects.create(user=User.objects.create_user('owner'),role='admin',display_name='Owner')
        self.teacher=Profile.objects.create(user=User.objects.create_user('teacher'),role='teacher',display_name='Teacher')
        self.student=Profile.objects.create(user=User.objects.create_user('learner'),role='student',display_name='Learner')
        self.section=SchoolClass.objects.create(name='Section',teacher=self.teacher,code='TEST')
        Enrollment.objects.create(student=self.student,school_class=self.section,enrolled_by=self.teacher)
        for slug in ('career','enrichment'): CurriculumPackage.objects.get_or_create(slug=slug,defaults={'name':slug})
        self.old=Lesson.objects.create(package=CurriculumPackage.objects.get(slug='enrichment'),title='Old movement',competency_code='ENRICH-03',status='approved',created_by=self.admin)
        self.activity=Activity.objects.create(type='image',title='Original',configuration={'original':True})
        self.slide=Slide.objects.create(lesson=self.old,position=0,title='Original',activity=self.activity)
        self.progress=LessonPracticeProgress.objects.create(student=self.student,school_class=self.section,lesson=self.old,completed_slide_ids=[self.slide.pk],activity_evidence={str(self.slide.pk):{'selected':'old answer'}})
        self.session=LearningSession.objects.create(student=self.student,school_class=self.section,lesson=self.old)
    def publish(self): call_command('publish_creative_lessons',owner='owner',stdout=StringIO())
    def test_fresh_ids_history_active_session_idempotence_and_rollback(self):
        self.publish();self.old.refresh_from_db();self.progress.refresh_from_db();self.session.refresh_from_db();self.activity.refresh_from_db()
        self.assertEqual(self.old.status,'archived');self.assertEqual(self.session.lesson_id,self.old.pk)
        self.assertEqual(self.activity.configuration,{'original':True})
        self.assertEqual(self.progress.completed_slide_ids,[self.slide.pk]);self.assertEqual(self.progress.activity_evidence[str(self.slide.pk)]['selected'],'old answer')
        new=Lesson.objects.get(competency_code='TPEP-dc-NG-4',archived_at__isnull=True)
        self.assertNotEqual(new.pk,self.old.pk);self.assertNotIn(self.slide.pk,new.slides.values_list('pk',flat=True))
        self.publish();self.assertEqual(Lesson.objects.filter(archived_at__isnull=True).count(),6)
        log=AuditLog.objects.get(action='creative_publication')
        call_command('publish_creative_lessons',owner='owner',rollback=log.pk,stdout=StringIO())
        self.old.refresh_from_db();self.assertIsNone(self.old.archived_at)
    def test_teacher_observation_is_authorized_and_distinct_from_student_confirmation(self):
        self.publish();lesson=Lesson.objects.get(competency_code='TPEP-dc-NG-4',archived_at__isnull=True)
        url=f'/api/classes/{self.section.pk}/students/{self.student.pk}/movement-observations/'
        data={'lesson_id':lesson.pk,'outcome':'adapted_observed','note':'Seated hand sequence observed.','confirmed':True}
        self.client.force_login(self.student.user);self.assertEqual(self.client.post(url,json.dumps(data),content_type='application/json').status_code,403)
        self.client.force_login(self.teacher.user);result=self.client.post(url,json.dumps(data),content_type='application/json');self.assertEqual(result.status_code,200,result.content)
        self.assertEqual(result.json()['observations'][0]['source'],'teacher_direct_observation')
        self.client.force_login(self.student.user);self.assertEqual(len(self.client.get(url).json()['observations']),1)
    def test_missing_or_tampered_creative_evidence_cannot_complete_practice(self):
        self.publish();lesson=Lesson.objects.get(competency_code='TP_CP-cp-NG-1',archived_at__isnull=True)
        slide=lesson.slides.first();url=f'/api/student/classes/{self.section.pk}/lessons/{lesson.pk}/'
        self.client.force_login(self.student.user)
        self.assertEqual(self.client.post(url,json.dumps({'slide_id':slide.pk}),content_type='application/json').status_code,400)
        self.assertEqual(self.client.post(url,json.dumps({'slide_id':slide.pk,'selected':'{}'}),content_type='application/json').status_code,400)
        selected=json.dumps({'version':'creative-journeys-v1','reviewed':True,'reflection':[]})
        self.assertEqual(self.client.post(url,json.dumps({'slide_id':slide.pk,'selected':selected}),content_type='application/json').status_code,200)


    def test_previous_practice_remains_accessible_and_other_packages_unchanged(self):
        other=Lesson.objects.create(package=CurriculumPackage.objects.get(slug='care'),title='Unrelated care lesson',competency_code='DO-NOT-CHANGE',status='approved',created_by=self.admin)
        self.publish();other.refresh_from_db();self.assertEqual(other.status,'approved')
        self.client.force_login(self.student.user)
        package=self.client.get(f'/api/student/classes/{self.section.pk}/packages/enrichment/')
        self.assertEqual(package.status_code,200,package.content)
        self.assertIn(self.old.pk,[row['id'] for row in package.json()['historical_lessons']])
        url=f'/api/student/classes/{self.section.pk}/lessons/{self.old.pk}/'
        self.assertEqual(self.client.get(url).status_code,200)
        self.assertEqual(self.client.post(url,json.dumps({'slide_id':self.slide.pk,'selected':'old answer'}),content_type='application/json').status_code,200)
        self.progress.refresh_from_db();self.assertEqual(self.progress.activity_evidence[str(self.slide.pk)]['selected'],'old answer')
    def test_observation_requires_assigned_teacher_and_explicit_confirmation(self):
        self.publish();lesson=Lesson.objects.get(competency_code='TPEP-dc-NG-4',archived_at__isnull=True)
        url=f'/api/classes/{self.section.pk}/students/{self.student.pk}/movement-observations/'
        data={'lesson_id':lesson.pk,'outcome':'observed','confirmed':False}
        self.client.force_login(self.teacher.user)
        self.assertEqual(self.client.post(url,json.dumps(data),content_type='application/json').status_code,400)
        other=Profile.objects.create(user=User.objects.create_user('other-teacher'),role='teacher')
        self.client.force_login(other.user)
        self.assertEqual(self.client.get(url).status_code,403)
        data['confirmed']=True
        self.assertEqual(self.client.post(url,json.dumps(data),content_type='application/json').status_code,403)
        self.assertFalse(AuditLog.objects.filter(action='movement_observation').exists())

    def test_collection_reads_only_the_enrolled_learners_persisted_evidence(self):
        self.publish();lesson=Lesson.objects.get(competency_code='TPEP-dt-NG-2',archived_at__isnull=True)
        slide=next(s for s in lesson.slides.select_related('activity') if s.activity.configuration.get('experience',{}).get('mode')=='art')
        selected=json.dumps({'version':'creative-journeys-v1','objects':[{'id':1,'shape':'star','color':'#534ab7','x':2,'y':1}],'background':'sky'})
        self.client.force_login(self.student.user)
        self.assertEqual(self.client.post(f'/api/student/classes/{self.section.pk}/lessons/{lesson.pk}/',json.dumps({'slide_id':slide.pk,'selected':selected}),content_type='application/json').status_code,200)
        url=f'/api/classes/{self.section.pk}/creative-collection/?package=enrichment'
        result=self.client.get(url);self.assertEqual(result.status_code,200,result.content)
        self.assertEqual(result.json()['entries'][0]['selected'],selected)
        publication = AuditLog.objects.get(action='creative_publication')
        call_command('publish_creative_lessons', rollback=publication.pk, stdout=StringIO())
        # Archiving a revision must not hide its owner's saved collection or practice.
        self.assertEqual(self.client.get(url).json()['entries'][0]['selected'], selected)
        history = self.client.get(f'/api/student/classes/{self.section.pk}/packages/enrichment/').json()
        self.assertIn(lesson.pk, [row['id'] for row in history['historical_lessons']])
        self.assertEqual(self.client.get(f'/api/student/classes/{self.section.pk}/lessons/{lesson.pk}/').status_code, 200)
        other=Profile.objects.create(user=User.objects.create_user('other-learner'),role='student')
        Enrollment.objects.create(student=other,school_class=self.section,enrolled_by=self.teacher)
        self.client.force_login(other.user);self.assertEqual(self.client.get(url).json()['entries'],[])
        self.assertEqual(self.client.get(f'/api/student/classes/{self.section.pk}/lessons/{lesson.pk}/').status_code, 404)
    def test_saved_creative_session_evidence_is_restored_without_reading_raw_eeg(self):
        self.publish();lesson=Lesson.objects.get(competency_code='TP_CP-cp-NG-1',archived_at__isnull=True)
        slide=lesson.slides.first();self.session.lesson=lesson;self.session.save(update_fields=['lesson'])
        selected=json.dumps({'version':'creative-journeys-v1','reviewed':True,'reflection':[]})
        ActivityResponse.objects.create(session=self.session,activity=slide.activity,response={'selected':selected},attempt_number=1,is_correct=None)
        self.client.force_login(self.student.user)
        result=self.client.get(f'/api/sessions/{self.session.pk}/eeg/')
        self.assertEqual(result.status_code,200,result.content)
        self.assertEqual(result.json()['activity_evidence'][str(slide.pk)]['selected'],selected)
