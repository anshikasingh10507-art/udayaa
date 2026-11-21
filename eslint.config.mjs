import securityRules from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', '.gmp_cache/**/*'],
  },
  securityRules.configs['flat/recommended'],
];
