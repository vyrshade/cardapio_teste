const checkAuth = require('../midlewares/checkAuthSu');
const express = require('express');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, Timestamp } = require('firebase-admin/firestore');

const router = express.Router();



function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/[^\d]+/g, '');

  if (!cnpj || cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  let digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) return false;

  tamanho += 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) pos = 9;
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1));
}

function validarCPF(cpf) {
  cpf = cpf.replace(/[^\d]+/g, '');

  if (!cpf || cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  return resto === parseInt(cpf.charAt(10));
}

function validarDocumento(doc) {
  const digits = doc.replace(/[^\d]+/g, '');
  return digits.length === 11 ? validarCPF(doc) : validarCNPJ(doc);
}


//novo usuario merchant
router.post('/newUser', async (req, res) => {
  const user = req.body;

  if (!validarDocumento(user.cnpj)) {
    return res.status(500).json({ status: 'error', message: 'CNPJ / CPF inválido!' });
  }

  const db = getFirestore();

  const merchantSnapshot = await db.collection(`merchant`).where('cnpj', '==', user.cnpj).limit(1)
    .get();

  if (!merchantSnapshot.empty) {
    return res.status(500).json({ status: 'error', message: 'Já existe uma conta com esse CNPJ / CPF!' });
  }


  await getAuth()
    .createUser({
      email: user.email,
      emailVerified: false,
      password: user.password,
      displayName: user.name,
    })
    .then(async (userRecord) => {

      let merchantId = '';

      if (user.isMerchantAdmin) {
        merchantId = userRecord.uid;

        const db = getFirestore();

        const merchantRef = db.collection('merchant').doc(userRecord.uid);

        const admConfigRef = db.collection('adm').doc('config');

        const admConfigDoc = await admConfigRef.get();

        //existe sempre..
        const admConfigData = admConfigDoc.data();

        const module = admConfigData.module;

        for (let x = 0; x < module.length; x++) {
          const element = module[x];
          if (element.enabled && element.monthlyAmount > 0) {
            const baseDate = Timestamp.now().toDate();
            baseDate.setDate(baseDate.getDate() + element.testDays);

            element.testDueDate = Timestamp.fromDate(baseDate);
          } else {
            element.testDueDate = null;
          }
        }

        await merchantRef.create({
          email: user.email,
          name: user.name,
          cnpj: user.cnpj,
          phone: user.phone,
          createdAt: Timestamp.now(),
          status: true,
          module: module
        });

      } else {
        merchantId = user.merchantId
      }

      let customClaims = {
        merchantId: merchantId
      }

      switch (user.type) {
        case 'adm':
          customClaims = {
            ...customClaims,
            admin: true,
            accessLevel: 10,
          };
          break;
        case 'wtr':
          customClaims = {
            ...customClaims,
            accessLevel: 5,
          };
          break;
        case 'kds':
          customClaims = {
            ...customClaims,
            accessLevel: 3,
          };
          break;

        default:
          customClaims = {
            ...customClaims,
            accessLevel: 1,
          };
          break;
      }

      try {
        // Set custom user claims on this newly created user.
        await getAuth().setCustomUserClaims(userRecord.uid, customClaims);
      } catch (error) {
        console.log(error);

        return res.status(500).json({
          message: error.message,
          code: error.code
        });
      }

      /*  */

      return res.json({ ...userRecord });
    })
    .catch((error) => {
      console.log('Error creating new user:', error);

      return res.status(500).json({
        message: error.message,
        code: error.code
      });
    });
});


/**
 * Validando recuperação de senha
 * 
 * falta o midleware rate limit
 * futuramente implementar o envio do link por aqui
 * por enquanto o front ira enviar usando o firebase
 */
router.post('/recPwd', async (req, res) => {

  try {
    const form = req.body;

    if (!validarDocumento(form.cnpj)) {
      return res.status(500).json({ status: 'error', message: 'CNPJ / CPF inválido!' });
    }

    const db = getFirestore();

    const merchantSnapshot = await db.collection(`merchant`).where('cnpj', '==', form.cnpj).limit(1)
      .get();

    if (merchantSnapshot.empty) {
      return res.status(500).json({ status: 'error', message: 'CNPJ / CPF não existe!' });
    }

    const data = merchantSnapshot.docs[0].data();

    if (data.email !== form.email) {
      return res.status(500).json({ status: 'error', message: 'E-MAIL não existe!' });
    }

    return res.status(200).json({ status: 'success', message: 'Enviamos em seu e-mail o link de recuperação de acesso!' });

  } catch (error) {
    console.log('error', error);

    return res.status(404);
  }
});


//disable-user
router.post('/disableMerchant', checkAuth, async (req, res) => {
  const { merchantId } = req.body;
  try {
    await getAuth().updateUser(merchantId, { disabled: true });

    const db = getFirestore();

    const usersSnapshot = await db.collection(`merchant/${merchantId}/user`)
      .get();

    const disablePromises = usersSnapshot.docs.map(doc => {
      const { uid } = doc.data();
      if (uid) {
        return getAuth().updateUser(uid, { disabled: true });
      }
      return null;
    });

    await Promise.all(disablePromises);

    res.status(200).json({ status: 'success', message: 'Usuário desativado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



//enable-user
router.post('/enableMerchant', checkAuth, async (req, res) => {
  const { merchantId } = req.body;
  try {
    await getAuth().updateUser(merchantId, { disabled: false });

    const db = getFirestore();

    const usersSnapshot = await db.collection(`merchant/${merchantId}/user`)
      .get();

    const disablePromises = usersSnapshot.docs.map(doc => {
      const { uid } = doc.data();
      if (uid) {
        return getAuth().updateUser(uid, { disabled: false });
      }
      return null;
    });

    await Promise.all(disablePromises);

    res.status(200).json({ status: 'success', message: 'Usuário ativado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;
