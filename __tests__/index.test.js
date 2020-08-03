// What is being tested? For example, the ProductsService.addNewProduct method
// Under what circumstances and scenario? For example, no price is passed to the method
// What is the expected result? For example, the new product is not approved
const app = require('../index');
const supertest = require('supertest');
const request = supertest(app);

describe('Index / Server File', () => {
  it('Routes are imported', () => {
    const authenticateRoutes = require('../routes/authenticate');
    const avatarRoutes = require('../routes/avatar');
    const userRoutes = require('../routes/user');

    expect(authenticateRoutes).toBeTruthy();
    expect(avatarRoutes).toBeTruthy();
    expect(userRoutes).toBeTruthy();
  });

});