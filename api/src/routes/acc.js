const { format, addDays, max } = require('date-fns');
const checkAuth = require('../midlewares/checkAuthAdm');
const express = require('express');
const { getFirestore } = require('firebase-admin/firestore');
const checkWebhook = require('../midlewares/checkWebhook');

const router = express.Router();





router.post('/subscriptions', checkAuth, async (req, res) => {
  const { merchantId, billingType, moduleId, description } = req.body;

  try {

    const db = getFirestore();

    const merchantRef = db.collection(`merchant`).doc(merchantId);

    const merchantSnap = await merchantRef.get();

    if (!merchantSnap.exists) {
      return res.status(500).json({ status: 'error', message: 'Merchant inválido' });
    }

    const merchantData = merchantSnap.data();

    const cnpj = merchantData.cnpj.replace(/[^\d]+/g, '');
    const name = merchantData.name;


    //verifica se ja existe o cliente asaas
    const urlCustomerExists = process.env.ASAAS_URL + '/customers?cpfCnpj=' + cnpj;
    const optionsCustomerExists = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        access_token: process.env.ASAAS_ACCESS_TOKEN
      }
    };

    const responseCustomerExists = await fetch(urlCustomerExists, optionsCustomerExists);

    if (!responseCustomerExists.ok) {
      const body = await responseCustomerExists.text();
      //retorna erro (s)
      return res.status(responseCustomerExists.status).json({
        message: body
      });
    }

    const dataCustomerExists = await responseCustomerExists.json();

    let customerId = null;

    if (dataCustomerExists.totalCount > 0) {
      customerId = dataCustomerExists.data[0].id;
    } else {


      const urlCustomer = process.env.ASAAS_URL + '/customers';
      const optionsCustomer = {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          access_token: process.env.ASAAS_ACCESS_TOKEN
        },
        body: JSON.stringify({
          name: name,
          cpfCnpj: cnpj
        })
      };

      const responseCustomer = await fetch(urlCustomer, optionsCustomer);

      if (!responseCustomer.ok) {
        const body = await responseCustomer.text();
        //retorna erro (s)
        return res.status(responseCustomer.status).json({
          message: body
        });
      }

      const dataCustomer = await responseCustomer.json();

      customerId = dataCustomer.id;
    }

    //pega o modulo por aqui + seg..
    const module = merchantData.module.find(m => m.moduleId === moduleId);

    //trata para manter minimo hoje como vencimento da primeira
    const due = max([
      addDays(merchantData.createdAt.toDate(), module.testDays),
      new Date()
    ]);

    const dueDate = format(due, 'yyyy-MM-dd');

    const url = process.env.ASAAS_URL + '/subscriptions';
    const options = {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        access_token: process.env.ASAAS_ACCESS_TOKEN
      },
      body: JSON.stringify({
        billingType: billingType,
        cycle: 'MONTHLY',
        customer: customerId,
        value: module.monthlyAmount,
        nextDueDate: dueDate,
        description: description,
        externalReference: merchantId
      })
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const body = await response.text();
      //retorna erro (s)
      return res.status(response.status).json({
        message: body
      });
    }

    const data = await response.json();

    //salva o id da assinatura no modulo do cliente
    module.subscriptionId = data.id

    await merchantRef.set({
      module: merchantData.module,
      customerId: customerId
    }, { merge: true });

    return res.status(200).json({
      data
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Erro interno'
    });
  }
});


router.get('/subscriptions/:customer', checkAuth, async (req, res) => {
  const { customer } = req.params;

  try {

    const url = process.env.ASAAS_URL + '/subscriptions?customer=' + customer;
    const options = {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        access_token: process.env.ASAAS_ACCESS_TOKEN
      }
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const body = await response.text();
      //retorna erro (s)
      return res.status(response.status).json({
        message: body
      });
    }

    const data = await response.json();

    return res.status(200).json({
      ...data
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Erro interno'
    });
  }
});


router.put('/subscriptions/:id', checkAuth, async (req, res) => {

  const { id } = req.params;
  const update = req.body;

  try {

    const url = process.env.ASAAS_URL + '/subscriptions/' + id;
    const options = {
      method: 'PUT',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        access_token: process.env.ASAAS_ACCESS_TOKEN
      },
      body: JSON.stringify({
        ...update
      })
    };

    const response = await fetch(url, options);

    if (!response.ok) {
      const body = await response.text();
      //retorna erro (s)
      return res.status(response.status).json({
        message: body
      });
    }

    const data = await response.json();
    /* 
        const externalReference = data?.externalReference
    
        if (!externalReference) {
          console.error('Sem id do merchant no evento');
          return res.status(500).json({ message: 'Sem id do merchant no evento' });
        }
    
        const db = getFirestore();
        const batch = db.batch();
    
        const eventRef = db.collection(`event`).doc();
        const eventMerchantRef = db.collection(`merchant/${externalReference}/event`).doc();
    
        const event = {
          dateCreated: data.dateCreated,
          event: 'SUBSCRIPTION_INACTIVATED',
          subscription: {
            ...data
          }
        }
    
        batch.set(eventRef, event);
        batch.set(eventMerchantRef, event);
    
        await batch.commit();
     */
    return res.status(200).json({
      data
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Erro interno'
    });
  }
});


router.post('/events', checkWebhook, async (req, res) => {
  const event = req.body;

  try {
    //rever isso para capturar merchantId
    const externalReference = event?.subscription?.externalReference || event?.payment?.externalReference

    if (!externalReference) {
      console.error('Sem id do merchant no evento');
      return res.status(200).json({ message: 'ok' });
    }

    const db = getFirestore();
    const batch = db.batch();

    const eventRef = db.collection(`event`).doc();
    const eventMerchantRef = db.collection(`merchant/${externalReference}/event`).doc();

    batch.set(eventRef, event);
    batch.set(eventMerchantRef, event);

    await batch.commit();

    return res.status(200).json({ message: 'ok' });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: 'Erro interno'
    });
  }
});


module.exports = router;
