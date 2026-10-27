const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

async function rules() {
  const source = fs.readFileSync(path.join(__dirname, '../js/libras.js'), 'utf8');
  const context = vm.createContext({ EventTarget, Event, performance });
  const vision = new vm.SyntheticModule(['LM', 'splitHandsByRole'], function () {
    this.setExport('LM', {});
    this.setExport('splitHandsByRole', () => ({ left: null, right: null }));
  }, { context });
  const diagnostics = new vm.SyntheticModule(['diagnostics'], function () {
    this.setExport('diagnostics', { enabled: false, calibrationActive: false });
  }, { context });
  const module = new vm.SourceTextModule(`${source}\nexport { RULES };`, { context });
  await module.link((specifier) => specifier === './vision.js' ? vision : diagnostics);
  await module.evaluate();
  return module.namespace.RULES;
}

const twoFingers = {
  extIndex: .85, extMiddle: .96, extRing: -.15, extPinky: -.12,
  spreadIM: .51, thumbBetweenIM: .61, pointAngleIM: 4
};

test('V e K exigem anelar e mínimo recolhidos sem perder separação pelo polegar', async () => {
  const { V, K } = await rules();
  const v = { ...twoFingers };
  const k = { ...twoFingers, thumbBetweenIM: .19 };
  assert.ok(V(v) > K(v), 'polegar afastado favorece V');
  assert.ok(K(k) > V(k), 'polegar entre indicador e médio favorece K');
  assert.ok(V(v) >= .55 && K(k) >= .55);

  for (const open of [
    { extRing: .76, extPinky: .61, thumbBetweenIM: .73 },
    { extRing: .78, extPinky: .59, thumbBetweenIM: .62 },
    { extRing: .72, extPinky: -.12, thumbBetweenIM: .61 },
    { extRing: -.15, extPinky: .69, thumbBetweenIM: .19 }
  ]) {
    const hand = { ...twoFingers, ...open };
    assert.ok(V(hand) < .55, `V aceitou anelar/mínimo aberto: ${JSON.stringify(open)}`);
    assert.ok(K(hand) < .55, `K aceitou anelar/mínimo aberto: ${JSON.stringify(open)}`);
  }
  assert.ok(K(v) < .55, 'K não aceita polegar afastado de indicador e médio');
});

test('V/K toleram flexão limítrofe e pequena oscilação', async () => {
  const { V, K } = await rules();
  for (const ext of [.28, .34, .39]) {
    const v = { ...twoFingers, extRing: ext, extPinky: ext - .02 };
    const k = { ...v, thumbBetweenIM: .19 };
    assert.ok(V(v) >= .55, `V com flexão ${ext}`);
    assert.ok(K(k) >= .55, `K com flexão ${ext}`);
    assert.ok(V(v) > K(v));
    assert.ok(K(k) > V(k));
  }
});
