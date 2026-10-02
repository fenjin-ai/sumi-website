export default {
  extends: ['stylelint-config-standard'],
  reportNeedlessDisables: true,
  reportInvalidScopeDisables: true,
  reportDescriptionlessDisables: true,
  reportUnscopedDisables: true,
  rules: {
    'no-descending-specificity': [true, { ignore: ['selectors-within-list'] }],
    'selector-max-id': 1,
    'declaration-block-no-redundant-longhand-properties': true,
  },
};
