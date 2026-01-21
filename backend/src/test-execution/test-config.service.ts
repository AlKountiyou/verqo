import { Injectable } from '@nestjs/common';

export interface TestToolConfig {
  name: string;
  command: string;
  installCommand?: string;
  configFile?: string;
  supportedFrameworks: string[];
  category: 'BACKEND' | 'FRONTEND' | 'PERFORMANCE' | 'UNIT';
}

@Injectable()
export class TestConfigService {
  private readonly testTools: TestToolConfig[] = [
    // Backend Testing Tools
    {
      name: 'Jest',
      command: 'npx jest',
      installCommand: 'npm install --save-dev jest @types/jest',
      configFile: 'jest.config.js',
      supportedFrameworks: ['node', 'express', 'nestjs'],
      category: 'BACKEND',
    },
    {
      name: 'Mocha',
      command: 'npx mocha',
      installCommand: 'npm install --save-dev mocha chai',
      configFile: '.mocharc.json',
      supportedFrameworks: ['node', 'express'],
      category: 'BACKEND',
    },
    {
      name: 'JUnit',
      command: 'mvn test',
      installCommand: 'mvn dependency:resolve',
      configFile: 'pom.xml',
      supportedFrameworks: ['java', 'spring'],
      category: 'BACKEND',
    },
    {
      name: 'pytest',
      command: 'pytest',
      installCommand: 'pip install pytest',
      configFile: 'pytest.ini',
      supportedFrameworks: ['python', 'django', 'flask'],
      category: 'BACKEND',
    },
    {
      name: 'RSpec',
      command: 'bundle exec rspec',
      installCommand: 'bundle install',
      configFile: 'spec/spec_helper.rb',
      supportedFrameworks: ['ruby', 'rails'],
      category: 'BACKEND',
    },

    // Frontend Testing Tools
    {
      name: 'Jest + React Testing Library',
      command: 'npm test -- --watchAll=false',
      installCommand: 'npm install --save-dev @testing-library/react @testing-library/jest-dom',
      configFile: 'jest.config.js',
      supportedFrameworks: ['react', 'next'],
      category: 'FRONTEND',
    },
    {
      name: 'Vue Test Utils',
      command: 'npm run test:unit',
      installCommand: 'npm install --save-dev @vue/test-utils',
      configFile: 'jest.config.js',
      supportedFrameworks: ['vue', 'nuxt'],
      category: 'FRONTEND',
    },
    {
      name: 'Angular Testing',
      command: 'ng test --watch=false',
      installCommand: 'npm install',
      configFile: 'angular.json',
      supportedFrameworks: ['angular'],
      category: 'FRONTEND',
    },
    {
      name: 'Cypress',
      command: 'npx cypress run',
      installCommand: 'npm install --save-dev cypress',
      configFile: 'cypress.config.js',
      supportedFrameworks: ['react', 'vue', 'angular', 'svelte'],
      category: 'FRONTEND',
    },
    {
      name: 'Playwright',
      command: 'npx playwright test',
      installCommand: 'npm install --save-dev @playwright/test',
      configFile: 'playwright.config.ts',
      supportedFrameworks: ['react', 'vue', 'angular', 'svelte'],
      category: 'FRONTEND',
    },

    // Performance Testing Tools
    {
      name: 'Lighthouse',
      command: 'npx lighthouse',
      installCommand: 'npm install -g lighthouse',
      configFile: 'lighthouse.config.js',
      supportedFrameworks: ['web'],
      category: 'PERFORMANCE',
    },
    {
      name: 'Artillery',
      command: 'npx artillery run',
      installCommand: 'npm install -g artillery',
      configFile: 'artillery.yml',
      supportedFrameworks: ['api', 'web'],
      category: 'PERFORMANCE',
    },
    {
      name: 'K6',
      command: 'k6 run',
      installCommand: 'brew install k6',
      configFile: 'k6-script.js',
      supportedFrameworks: ['api', 'web'],
      category: 'PERFORMANCE',
    },
    {
      name: 'JMeter',
      command: 'jmeter -n -t',
      installCommand: 'brew install jmeter',
      configFile: 'test-plan.jmx',
      supportedFrameworks: ['api', 'web'],
      category: 'PERFORMANCE',
    },

    // Unit Testing Tools
    {
      name: 'Jest Unit Tests',
      command: 'npx jest --testPathPattern=unit',
      installCommand: 'npm install --save-dev jest',
      configFile: 'jest.config.js',
      supportedFrameworks: ['node', 'react', 'vue'],
      category: 'UNIT',
    },
    {
      name: 'Vitest',
      command: 'npx vitest run',
      installCommand: 'npm install --save-dev vitest',
      configFile: 'vitest.config.ts',
      supportedFrameworks: ['node', 'react', 'vue'],
      category: 'UNIT',
    },
    {
      name: 'Jasmine',
      command: 'npx jasmine',
      installCommand: 'npm install --save-dev jasmine',
      configFile: 'jasmine.json',
      supportedFrameworks: ['node', 'angular'],
      category: 'UNIT',
    },
  ];

  getToolsByCategory(category: 'BACKEND' | 'FRONTEND' | 'PERFORMANCE' | 'UNIT'): TestToolConfig[] {
    return this.testTools.filter(tool => tool.category === category);
  }

  getToolByName(name: string): TestToolConfig | undefined {
    return this.testTools.find(tool => tool.name === name);
  }

  getAllTools(): TestToolConfig[] {
    return this.testTools;
  }

  getRecommendedTools(framework: string, category: 'BACKEND' | 'FRONTEND' | 'PERFORMANCE' | 'UNIT'): TestToolConfig[] {
    return this.testTools.filter(tool => 
      tool.category === category && 
      tool.supportedFrameworks.some(f => f.toLowerCase().includes(framework.toLowerCase()))
    );
  }

  generateTestScript(tool: TestToolConfig, projectPath: string): string {
    const scripts = {
      'Jest': `#!/bin/bash
cd ${projectPath}
if [ ! -f "package.json" ]; then
  echo "package.json not found"
  exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  npm install
fi

# Run tests
${tool.command}
`,

      'Mocha': `#!/bin/bash
cd ${projectPath}
if [ ! -f "package.json" ]; then
  echo "package.json not found"
  exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  npm install
fi

# Run tests
${tool.command}
`,

      'JUnit': `#!/bin/bash
cd ${projectPath}
if [ ! -f "pom.xml" ]; then
  echo "pom.xml not found"
  exit 1
fi

# Run tests
${tool.command}
`,

      'pytest': `#!/bin/bash
cd ${projectPath}
if [ ! -f "requirements.txt" ] && [ ! -f "pyproject.toml" ]; then
  echo "Python project files not found"
  exit 1
fi

# Install dependencies
pip install -r requirements.txt 2>/dev/null || pip install -e .

# Run tests
${tool.command}
`,

      'Lighthouse': `#!/bin/bash
cd ${projectPath}

# Run Lighthouse
${tool.command} $STAGING_URL --output=json --chrome-flags="--headless"
`,

      'Artillery': `#!/bin/bash
cd ${projectPath}

# Create Artillery config if it doesn't exist
if [ ! -f "artillery.yml" ]; then
  cat > artillery.yml << EOF
config:
  target: '$STAGING_URL'
  phases:
    - duration: 60
      arrivalRate: 5
scenarios:
  - name: "Load test"
    requests:
      - get:
          url: "/"
EOF
fi

# Run Artillery
${tool.command} artillery.yml
`,
    };

    return scripts[tool.name] || `#!/bin/bash
cd ${projectPath}
${tool.command}
`;
  }
}
