const express = require('express');
//const { getAuth } = require('firebase-admin/auth');


const router = express.Router();



//apenas para gerar um adm nivel global
//manter desligada
/*
router.post("/newAdm", async (req, res) => {
  const user = req.body;

  await getAuth()
    .createUser({
      email: user.email,
      emailVerified: false,
      password: user.password,
      displayName: user.name,
    })
    .then(async (userRecord) => {


      let customClaims = {
        admin: true,
        accessLevel: 1000,
      }


      try {
        // Set custom user claims on this newly created user.
        await getAuth().setCustomUserClaims(userRecord.uid, customClaims);

        const link = await getAuth().generateEmailVerificationLink(user.email);

        return res.json({
          user: userRecord,
          verificationLink: link,
        });

      } catch (error) {
        console.log(error);

        res.status(500).json({
          message: error.message,
          code: error.code
        });
      }

    })
    .catch((error) => {
      console.log("Error creating new user:", error);

      res.status(500).json({
        message: error.message,
        code: error.code
      });
    });
});
*/


module.exports = router;
