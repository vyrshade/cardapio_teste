import * as React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Grid, Typography } from '@mui/material';
import { fetchMerchants, fetchPayments } from './api';
import { useData } from './context';
import { format, parseISO } from 'date-fns';
import { translateEvent } from './utils/translateEvent';







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





export default function PagamentoLista() {

  const { data } = useData();


  return (
    <Grid container p={0} spacing={2}>
      <DataFetcher />

      <Grid container size={12}>
        {!!data.adm.payment.length &&
          <TableContainer component={Paper} elevation={0}>
            <Table size='small'>
              <TableHead>
                <TableRow>
                  <TableCell>Estabelecimento</TableCell>
                  <TableCell>Descrição</TableCell>
                  <TableCell>Vencimento</TableCell>
                  <TableCell>Forma Pagamento</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Valor</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {
                  data.adm.payment
                    .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
                    .filter((item, index, self) => index === self.findIndex(i => i.payment.id === item.payment.id))
                    .map((row) => {

                      const value = row.payment.value;
                      const dueDate = format(new Date(parseISO(row.payment.originalDueDate)), 'dd/MM/yyyy');
                      const status = row.payment.status;
                      const billingType = `${row.payment.billingType === 'UNDEFINED' ? 'Boleto / Pix' : row.payment.billingType}`

                      //STATUS PAYMENT_OVERDUE VIRA DA INTEGRAÇÃO, DECIDIR SE BLOQUEIA
                      const vencido = new Date() > new Date(parseISO(row.payment.originalDueDate)) && status === 'PENDING';

                      //MELHORAR ISSO
                      const merchantName = data.adm.mct?.find(m => m.merchantId === row.payment.externalReference)?.name;

                      return (
                        <TableRow key={row.id}>
                          <TableCell>
                            {merchantName}
                          </TableCell>
                          <TableCell>
                            {translateEvent(row.event)}
                          </TableCell>
                          <TableCell>
                            {dueDate}
                          </TableCell>
                          <TableCell>
                            {billingType}
                          </TableCell>
                          <TableCell>
                            <Typography color={vencido ? 'error' : 'textPrimary'}>
                              {translateEvent(status)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
              </TableBody>
            </Table>
          </TableContainer>
        }

      </Grid>
    </Grid>
  );
}
