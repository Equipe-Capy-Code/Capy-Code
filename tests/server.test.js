const request = require('supertest');
const app = require('../server');

describe('API Capy Code', () => {
  it('Deve retornar uma lista de artigos (GET /api/articles)', async () => {
    const response = await request(app).get('/api/articles');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('articles');
  });

  it('Deve bloquear acesso não autorizado na rota de admin', async () => {
    const response = await request(app).post('/api/articles').send({
      title: 'Artigo Invasor',
      content: 'Isso nao deve passar'
    });
    // Como não passamos o x-admin-token, deve retornar 401
    expect(response.status).toBe(401);
  });
});
