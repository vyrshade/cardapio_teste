import * as React from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Chip, CircularProgress, Grid, Stack, Switch, Tooltip } from '@mui/material';
import { fetchMerchants, fetchPayments, updateMerchant, useAdmUser } from './api';
import { useData } from './context';
import { Edit, HelpOutline } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { format, parseISO } from 'date-fns';







const DataFetcher = () => {
  const { setData } = useData();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {

    const unsubscribe = fetchMerchants(null,
      (data) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          adm: {
            ...state.adm,
            mct: [...data]
          }
        }));

        //setLoading(false);
      },
      (error) => {
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [setData]);

  React.useEffect(() => {

    const unsubscribe = fetchPayments(null,
      (data) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          adm: {
            ...state.adm,
            payment: [...data]
          }
        }));

        setLoading(false);
      },
      (error) => {
        setError(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [setData]);




  if (loading) return null;
  if (error) return <div>Error: {error.message}</div>;

  return null;
};





function Row(props) {

  const { data } = useData();

  const { row } = props;

  const [checked, setChecked] = React.useState(row.status);

  const [submiting, setSubmiting] = React.useState(false);

  const navigate = useNavigate();

  const { user } = useAdmUser();

  // Formata telefone no padrão brasileiro (10 ou 11 dígitos).
  const formatPhone = (value) => {
    const raw = String(value ?? '').trim();
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length === 10) {
      return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    if (digits.length === 11) {
      return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return raw;
  };

  //ativa ou desativa..
  const handleChange = async () => {

    const token = await user.getIdToken();

    setSubmiting(true);

    if (checked) {
      try {
        const resposta = await fetch(`${import.meta.env.VITE_API_URL}/disableMerchant`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            merchantId: row.merchantId
          }),
        });

        const res = await resposta.json();

        setSubmiting(false);

        if (res.status === 'success') {

          setChecked(false);

          updateMerchant(row.merchantId, { status: false });
        }


      } catch (erro) {
        console.error('Erro ao desativar merchant:', erro);
      }
    } else {

      ////ATIVANDO
      try {
        const resposta = await fetch(`${import.meta.env.VITE_API_URL}/enableMerchant`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            merchantId: row.merchantId
          }),
        });

        const res = await resposta.json();

        setSubmiting(false);

        if (res.status === 'success') {

          setChecked(true);

          updateMerchant(row.merchantId, { status: true });
        }


      } catch (erro) {
        console.error('Erro ao desativar merchant:', erro);
      }
    }
  };


  const events = data.adm.payment
    .filter(e => e.payment.externalReference === row.merchantId)
    .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))


  return (
    <React.Fragment>
      <TableRow>
        <TableCell>
          <IconButton
            onClick={() => navigate(`mct/${row.merchantId}`)}
          >
            <Edit />
          </IconButton>
        </TableCell>
        <TableCell>{row.name}</TableCell>
        <TableCell>{row.cnpj}</TableCell>
        <TableCell>{formatPhone(row.phone)}</TableCell>
        <TableCell>{format(new Date(row.createdAt?.seconds * 1000), 'dd/MM/yyy')}</TableCell>
        <TableCell>
          <Stack spacing={1}>
            {
              row.module?.map((m) => {

              let color = 'default';

                const overdueTest = new Date() > new Date(m?.testDueDate?.seconds * 1000);

                if (overdueTest) {
                  color = 'warning';
                } else if (m.enabled) {
                  color = 'info'
              }

              const payments = events.filter(p => p.payment.subscription === m?.subscriptionId);

                const lastPayment = payments.length ? payments[0] : null

              const statusPayment = lastPayment ? lastPayment.payment.status : '';

                //STATUS PAYMENT_OVERDUE VIRA DA INTEGRAÇÃO, DECIDIR SE BLOQUEIA
                const overduePayment = new Date() > new Date(parseISO(lastPayment?.payment.originalDueDate)) && statusPayment === 'PENDING';

              const canceled = m.subscriptionInactivated;

              if (canceled || overduePayment) {
                color = 'error';
              }

              if (lastPayment?.payment?.status === 'RECEIVED' || lastPayment?.payment?.status === 'CONFIRMED') {
                color = 'success';
              }

              return (
                <Chip
                  key={m.moduleId}
                  label={m.name}
                  color={color}
                  variant=''
                  size='small'
                  sx={{
                    fontStyle: canceled ? 'italic' : 'normal',
                    textDecoration: canceled ? 'line-through' : 'none'
                  }}
                />
                )
              })
            }
          </Stack>
        </TableCell>
        <TableCell align="left">
          {submiting ? (
            <Box
              paddingLeft={1}
            >
              <CircularProgress size={32} />
            </Box>
          ) : (
            <Switch checked={checked} onChange={handleChange} />
          )}
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}







export default function MerchantList() {

  const { data } = useData();

  return (
    <Grid container size={12}>

      <DataFetcher />

      <TableContainer component={Paper} elevation={0}>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Ação</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>CNPJ</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Cadastro</TableCell>
              <TableCell>
                <Stack direction='row' gap={1} alignItems='center'>
                  Módulos
                  <Tooltip
                    arrow
                    placement='top'
                    slotProps={{
                      tooltip: {
                        sx: {
                          bgcolor: 'background.paper',
                          color: 'text.primary',
                          boxShadow: 3,
                          border: '1px solid',
                          borderColor: 'divider',
                          p: 1
                        }
                      },
                      arrow: {
                        sx: {
                          color: 'background.paper'
                        }
                      }
                    }}

                    title={
                      <Stack spacing={1} flexGrow={1} p={2}>
                        <Chip label='Desligado' color='default' size='small' />
                        <Chip label='Em teste' color='info' size='small' />
                        <Chip label='Teste expirado' color='warning' size='small' />
                        <Chip label='Pagamento em atraso' color='error' size='small' />
                        <Chip label='Assinatura cancelada' color='error' size='small'
                          sx={{
                            fontStyle: 'italic',
                            textDecoration: 'line-through'
                          }}
                        />
                        <Chip label='Assinatura paga e em dia' color='success' size='small' />
                      </Stack>
                    }
                  >
                    <Box
                      component='span'
                      sx={{
                        display: 'inline-flex',
                      }}
                    >
                      <HelpOutline fontSize='small' color='action' />
                    </Box>
                  </Tooltip>
                </Stack>
              </TableCell>
              <TableCell align="left">Ativo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.adm.mct.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds).map((row) => (
                <Row key={row.merchantId} row={row} />
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Grid>
  );
}
