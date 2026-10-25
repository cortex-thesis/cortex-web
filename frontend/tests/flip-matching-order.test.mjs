import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'
const source=await readFile(new URL('../src/lib/flipMatchingOrder.ts',import.meta.url),'utf8')
const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}})
const {shuffledMatchingDeck}=await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'))
function clues(cards) {
 const cols=[...new Set([2,cards.length>=8&&cards.length%4===0?4:3])]
 let score=0
 for(let a=0;a<cards.length;a++) for(let b=a+1;b<cards.length;b++) if(cards[a].pairId===cards[b].pairId) {
  for(const width of cols) if(Math.abs(Math.floor(a/width)-Math.floor(b/width))+Math.abs(a%width-b%width)===1)score++
 }
 return score
}
test('flip decks independently randomize both sides, preserve relationships and reduce responsive adjacency clues',()=>{
 let seed=921841
 const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)
 for(const count of [0,1,2,3,4,5,6,8]) {
  const pairs=Array.from({length:count},(_,index)=>({id:String(index),left:{id:'l'+index,label:'Prompt '+index},right:{id:'r'+index,label:'Answer '+index}}))
  const original=JSON.stringify(pairs),orders=new Set(),prompts=new Set(),answers=new Set()
  for(let sample=0;sample<60;sample++) {
   const cards=shuffledMatchingDeck(pairs,random)
   assert.equal(cards.length,count*2)
   assert.equal(new Set(cards.map(c=>c.key)).size,count*2)
   for(const pair of pairs) {
    assert.equal(cards.find(c=>c.key===pair.id+':picture').item,pair.left)
    assert.equal(cards.find(c=>c.key===pair.id+':meaning').item,pair.right)
   }
   if(count>=2) assert.ok(clues(cards)<=2, 'avoidable adjacent pairs')
   orders.add(cards.map(c=>c.key).join(','))
   prompts.add(cards.filter(c=>c.key.endsWith(':picture')).map(c=>c.pairId).join(','))
   answers.add(cards.filter(c=>c.key.endsWith(':meaning')).map(c=>c.pairId).join(','))
  }
  assert.equal(JSON.stringify(pairs),original)
  if(count>=2) {assert.ok(orders.size>1);assert.ok(prompts.size>1);assert.ok(answers.size>1)}
 }
})
test('reset avoids the previous full order and fallback is bounded',()=>{
 const pairs=Array.from({length:3},(_,i)=>({id:String(i),left:{id:'l'+i,label:'L'+i},right:{id:'r'+i,label:'R'+i}}))
 const deck=shuffledMatchingDeck(pairs,()=>0)
 const next=shuffledMatchingDeck(pairs,()=>0,deck.map(c=>c.key))
 assert.notDeepEqual(next.map(c=>c.key),deck.map(c=>c.key))
 assert.equal(new Set(next.map(c=>c.key)).size,6)
})
