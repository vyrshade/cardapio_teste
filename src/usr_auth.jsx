import { useNavigate, useParams } from 'react-router';
import { useKdsUser, useWtrUser } from './api';
import { useEffect } from 'react';
import { Typography } from '@mui/material';

export default function UsuarioAuth() {
  const { merchantId, token, type } = useParams();

  const { user, loading, claims } = type === 'wtr' ? useWtrUser(merchantId, token) : type === 'kds' && useKdsUser(merchantId, token);

  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user || !claims) return;

    switch (type) {
      case 'wtr':
        navigate('/wtr/tbl')
        break;
      case 'kds':
        navigate('/kds')
        break;

      default:
        break;
    }

  }, [merchantId, loading, claims, user]);

  return <Typography>Autenticando dispositivo...</Typography>;
}
