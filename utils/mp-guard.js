function defineApp(options) {
  if (typeof App === 'function') return App(options);
  return undefined;
}

function definePage(options) {
  if (typeof Page === 'function') return Page(options);
  return undefined;
}

function defineComponent(options) {
  if (typeof Component === 'function') return Component(options);
  return undefined;
}

module.exports = {
  defineApp,
  definePage,
  defineComponent
};

