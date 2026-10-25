import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import ts from 'typescript'
const source = await readFile(new URL('../src/lib/matchingOrder.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2023}})
const { matchingOrder } = await import('data:text/javascript;base64,'+Buffer.from(outputText).toString('base64'))

test('independent matching shuffles preserve IDs, avoid aligned pairs and reduce adjacent clues', () => {
  let seed=456789
  const random=() => ((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)
  for (const count of [0,1,2,3,4,5,6,8,12]) {
    const pairs=Array.from({length:count},(_,index)=>({id:String(index),answer:'answer '+index}))
    const original=JSON.stringify(pairs), leftOrders=new Set(), rightOrders=new Set()
    for(let attempt=0;attempt<80;attempt++) {
      const {left,right}=matchingOrder(pairs,random)
      assert.deepEqual(new Set(left),new Set(pairs))
      assert.deepEqual(new Set(right),new Set(pairs))
      if(count>1) right.forEach((pair,index)=>assert.notEqual(pair.id,left[index].id))
      if(count>=4) right.forEach((pair,index)=>assert.ok(Math.abs(left.indexOf(pair)-index)>1))
      leftOrders.add(left.map(p=>p.id).join(','))
      rightOrders.add(right.map(p=>p.id).join(','))
    }
    assert.equal(JSON.stringify(pairs),original)
    if(count>1) { assert.ok(leftOrders.size>1); assert.ok(rightOrders.size>1) }
  }
})
test('bounded fallback still avoids positional clues when random repeatedly returns zero', () => {
  for(const count of [2,3,4,5,8,12]) {
    const pairs=Array.from({length:count},(_,index)=>({id:String(index)}))
    const {left,right}=matchingOrder(pairs,()=>0)
    right.forEach((pair,index)=>assert.notEqual(pair.id,left[index].id))
    if(count>=4) right.forEach((pair,index)=>assert.ok(Math.abs(left.indexOf(pair)-index)>1))
  }
})
