const express = require('express');
const router = express.Router(); 
const Avatar = require('../db').Avatar;
const User = require('../db').User;
const Battle = require('../db').Battle;
const db = require('../db').db;

// UPDATE HERO NAME
router.post('/update-avatar-name', function(req, res, next){
  //console.log('NN - ', req.body.owner, req.body.newHeroName);
  Avatar.update(
    { name : req.body.newHeroName },
    { where : { owner : req.body.owner}, returning : true },
  ).then((result) =>{console.log('!!', result[0]);
    if(result[0]){
      res.status(200).json({
        updatedName : result[1][0].name
      });
      next();
    }else{
      throw new Error('Unable to update Record');
    }
  }).catch((error) =>{
    console.log('Error updating name - ', error);
    res.status(400).json({
     error,
     message : 'Unable to update record'
    });
    next();
  });

});

// UPDATE USERNAME
router.post('/update-owner-username', function(req, res, next){
  console.log('NN - ', req.body.owner, req.body.newUsername);
  User.update(
    { username : req.body.newUsername },
    { where : { email : req.body.owner}, returning : true },
  ).then((result) =>{
    if(result[0]){
      res.status(200).json({
        updatedUsername: result[1][0].username
      });
      next();
    }else{
      throw new Error('Unable to update Record');
    }
  }).catch((error) =>{
    console.log('Error updating name - ', error);
    res.status(400).json({
     error,
     message : 'Unable to update record'
    });
    next();
  });

});

// DELETE ACCOUNT
router.delete('/:username', function(req, res, next){
  console.log('EM - ',req.body.id);
  Battle.destroy({
    where : {
      owner : req.body.email
    }
  }).then(() =>{
    return Avatar.destroy({
      where : {
        owner : req.body.email
      }
    })
  }).then(() =>{
    return User.destroy({
      where : {
        id : req.body.id
      }
    })
  }).then(() =>{
    res.status(200).json({
      message : 'Successfully deleted account!'
     });
     next();
  }).catch((error)=>{console.log(error);
    res.status(400).json({
      error,
      message : 'Unable to delete account!'
     });
     next();
  })
});

router.post('/toggle-feedback-boolean', async function(req, res, next){
  const hasSubmittedFeedback = req.body.setToTrue;
  console.log('HSF - ', hasSubmittedFeedback);
  const query = `UPDATE users SET "featurePreferenceSubmitted"=$1`;

  try{
    const [results, metadata] = await db.query(query, { bind : [hasSubmittedFeedback] });

    console.log('results!', metadata);
    if(results){
      res.status(200).json({
        results
      });
    }else{
      res.send(400);
    }
  }catch(error){
    console.log(error, test);
  }


});

// router.get('/migration', async function(req, res, next){
//   const q = `
//   SELECT avatars.name, avatars.owner, users.id FROM avatars
//   LEFT JOIN users ON avatars.owner=users.email
//   WHERE avatars.owner=$1
//   `;

//   const r = `
//     UPDATE avatars
//     SET "userId"=users.id
//     FROM users
//     WHERE owner=users.email;
//   `;

//   try{
//     const [results, metadata] = await db.query(r, { bind : ['oliver.h.coop@gmail.com'] });

//     console.log('results!', metadata);
//     if(results){
//       res.status(200).json({
//         results
//       });
//     }else{
//       res.send(400);
//     }
//   }catch(error){
//     console.log(error, test);
//   }


// });

module.exports = router;