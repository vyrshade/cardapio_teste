import { useEffect, useState } from 'react';
import { getAuth, applyActionCode } from 'firebase/auth';
import { useNavigate, useSearchParams } from 'react-router';

export const VerificaEmail = () => {
  const [status, setStatus] = useState('Verificando...');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    if (mode === 'verifyEmail' && oobCode) {
      applyActionCode(auth, oobCode)
        .then(() => {
          setStatus('e-mail ok!');

          navigate('mnt/first', { replace: true });
        })
        .catch((error) => {
          console.error(error);
          setStatus('link expirado!');
        });
    } else {
      setStatus('url inválida');
    }
  }, []);

  return (
    <div style={{ paddingLeft: 5 }}>
      <p>{status}</p>
    </div>
  );
};
