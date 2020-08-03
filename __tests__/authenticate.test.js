// What is being tested? For example, the ProductsService.addNewProduct method
// Under what circumstances and scenario? For example, no price is passed to the method
// What is the expected result? For example, the new product is not approved

const app = require('../index');
const supertest = require('supertest');
const request = supertest(app);


describe('Authentication Routes', () => {
  
  it('POST strava-credentials endpoint', async done => {
    const response = await request.post('/authenticate/strava-client-credentials')
    .send({email : 'brysonmk1984@gmail.com'});

    expect(response.status).toBe(200);


    done();
  });

  
  // it('POST signup-or-signin', async done => {
  //   const response = await request.post('/authenticate/signup-or-signin')
  //   .send({idToken: 'eyJraWQiOiJGVDVuWjFqUWt0bnBJcDZXNXRjZzNRSEtneGV6dHFiTUw4NFlZdDZQc244PSIsImFsZyI6IlJTMjU2In0.eyJhdF9oYXNoIjoiOWpUbFAxWVFlWTlUSWhpeWZFX3Q1USIsInN1YiI6IjVmNTUxNDUzLTQxZDYtNGQ0MS1iYTI3LWFlZGUzMzEyNDE5ZiIsImF1ZCI6IjNiYmdkNGI5aHIzbmpwYXB2dWZycmtwMjhvIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImV2ZW50X2lkIjoiYjgwY2Q4ODUtOWM1Zi00ZDE0LTk1MDUtOTVjMTllYTRmZWYzIiwidG9rZW5fdXNlIjoiaWQiLCJhdXRoX3RpbWUiOjE1OTY0ODU0NzYsImlzcyI6Imh0dHBzOlwvXC9jb2duaXRvLWlkcC51cy1lYXN0LTIuYW1hem9uYXdzLmNvbVwvdXMtZWFzdC0yX3FSNTY0NkJtWCIsImNvZ25pdG86dXNlcm5hbWUiOiJicnlzb25tazE5ODQiLCJleHAiOjE1OTY0ODkwNzYsImlhdCI6MTU5NjQ4NTQ3NiwiZW1haWwiOiJicnlzb25tazE5ODRAZ21haWwuY29tIn0.ZQR7H5gKJB0wqf1zaDEs4O4KBeeVlE-br4CNs5X3shIOzGdta4tInYfpIKwyjsJxMCOK9ZslXYwdbcxTR5L7WEAmWY0kkxL-qcvzudaJKLsPe8cmbeg8BFJq7h13Xa6RcXMxU4eryWn22u_uB5mdzoO74eaA5S8wRw6HQAuAHC4FbX0K0l1bcDOaLwucDT-m8RS20T4cBdiXzpBGvYvGIjYWzQskvVpbqBvV4WUEO909Dv99ZO_vtgPdXV80k1FMFTNjHZbRUgnRuRT6zBQzZZjiY7gjC9iGBkzz8Kz0AtR30tRZi-fZcevXbUyKBdCA6p53YTNdJ-m-EbYWwzFIHA'})

  //   expect(response.status).toBe(200);
    

  //   done();
  // });

  // it('GET strava-client-credentials endpoint', async done => {
  //   const response = await request.get('/authenticate/strava-client-credentials');

  //   expect(response.status).toBe(200);
  //   expect(response.body.clientId).toBe("50972");
  //   expect(response.body.clientSecret).toBe("fe017d77f2f7c12388cbc7067ef183aeb42830f0");
  //   expect(response.body.redirectUri).toBe("http://localhost:3000");

  //   done();
  // });
});