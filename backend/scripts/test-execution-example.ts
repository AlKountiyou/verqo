/**
 * Script d'exemple pour tester le système d'exécution de tests
 * 
 * Ce script montre comment utiliser les endpoints d'exécution de tests
 * via des appels HTTP (pour tester avec Postman ou curl)
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001';
const JWT_TOKEN = 'your-jwt-token-here'; // Récupérer depuis la connexion

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Authorization': `Bearer ${JWT_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

async function testExecutionFlow() {
  console.log('🚀 Test du système d\'exécution de tests Verqo\n');

  try {
    // 1. Créer un flow de test (exemple)
    console.log('1. Création d\'un flow de test...');
    const createFlowResponse = await api.post('/projects/PROJECT_ID/flows', {
      name: 'Test API Endpoints',
      description: 'Test des endpoints de l\'API',
      category: 'BACKEND',
      objective: 'Vérifier que tous les endpoints répondent correctement',
      methods: [
        'GET /api/health',
        'POST /api/users',
        'GET /api/users/:id'
      ]
    });
    
    const flowId = createFlowResponse.data.data.flow.id;
    console.log(`✅ Flow créé avec l'ID: ${flowId}\n`);

    // 2. Lancer l'exécution du flow
    console.log('2. Lancement de l\'exécution du flow...');
    const runResponse = await api.post(`/flows/${flowId}/run`);
    console.log(`✅ Flow ajouté à la queue: ${runResponse.data.data.jobId}\n`);

    // 3. Vérifier le statut du flow
    console.log('3. Vérification du statut...');
    const statusResponse = await api.get(`/flows/${flowId}/status`);
    console.log(`📊 Statut: ${statusResponse.data.data.status}\n`);

    // 4. Attendre un peu et récupérer les résultats
    console.log('4. Attente de l\'exécution (10 secondes)...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    const resultsResponse = await api.get(`/flows/${flowId}/results`);
    console.log(`📋 Résultats récupérés: ${resultsResponse.data.data.results.length} exécutions\n`);

    // 5. Afficher les détails du dernier résultat
    if (resultsResponse.data.data.results.length > 0) {
      const lastResult = resultsResponse.data.data.results[0];
      console.log('5. Détails du dernier résultat:');
      console.log(`   - Statut: ${lastResult.status}`);
      console.log(`   - Durée: ${lastResult.duration}ms`);
      console.log(`   - Screenshots: ${lastResult.screenshotUrls.length}`);
      console.log(`   - Logs: ${lastResult.logs.length} entrées\n`);
    }

    // 6. Récupérer les statistiques de la queue (admin seulement)
    console.log('6. Statistiques de la queue...');
    try {
      const queueStatsResponse = await api.get('/flows/queue/stats');
      console.log(`📈 Queue stats:`, queueStatsResponse.data.data.stats);
    } catch (error) {
      console.log('❌ Accès refusé aux statistiques (admin requis)');
    }

  } catch (error: any) {
    console.error('❌ Erreur:', error.response?.data || error.message);
  }
}

// Exemples d'endpoints à tester avec Postman/curl

console.log(`
📋 ENDPOINTS À TESTER AVEC POSTMAN:

🔐 AUTHENTIFICATION:
POST ${API_BASE_URL}/auth/login
{
  "email": "user@example.com",
  "password": "password"
}

📊 CRÉER UN FLOW:
POST ${API_BASE_URL}/projects/{projectId}/flows
{
  "name": "Test Backend API",
  "description": "Test des endpoints backend",
  "category": "BACKEND",
  "objective": "Vérifier la disponibilité des APIs",
  "methods": ["GET /api/health", "POST /api/test"]
}

🚀 LANCER UN TEST:
POST ${API_BASE_URL}/flows/{flowId}/run

📋 RÉCUPÉRER LES RÉSULTATS:
GET ${API_BASE_URL}/flows/{flowId}/results?page=1&limit=10

🔍 DÉTAIL D'UN RÉSULTAT:
GET ${API_BASE_URL}/flows/{flowId}/results/{resultId}

📊 STATUT D'UN FLOW:
GET ${API_BASE_URL}/flows/{flowId}/status

📈 STATISTIQUES DE LA QUEUE (ADMIN):
GET ${API_BASE_URL}/flows/queue/stats

🖼️ SCREENSHOT:
GET ${API_BASE_URL}/screenshots/{filename}

📝 EXEMPLES DE MÉTHODES DE TEST:

BACKEND:
- "GET /api/health"
- "POST /api/users"
- "npm test -- --grep 'user creation'"

FRONTEND:
- "navigate http://localhost:3000"
- "click button[data-testid='submit']"
- "check h1.title"

PERFORMANCE:
- "load test homepage"
- "stress test API"
- "benchmark database queries"

UNIT:
- "npm test -- --grep 'UserService'"
- "jest User.test.js"
- "mocha test/user.spec.js"
`);

// Exécuter le test si ce script est lancé directement
if (require.main === module) {
  testExecutionFlow();
}
