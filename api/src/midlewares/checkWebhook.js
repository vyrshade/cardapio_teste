
async function checkWebhook(req, res, next) {
  const token = req.headers['asaas-access-token'];

  if (!token) {
    return res.status(401).json({ error: 'Webhook token ausente' });
  }

  if (token !== process.env.ASAAS_WEBHOOK_TOKEN) {
    return res.status(401).json({ error: 'Webhook token inválido' });
  }

  next();
}

module.exports = checkWebhook;