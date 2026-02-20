import * as React from 'react';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Button, Grid, Typography } from '@mui/material';
import { fetchPayments } from './api';
import { useData } from './context';
import { useNavigate } from 'react-router';
import { Edit } from '@mui/icons-material';





const DataFetcher = () => {
  const { setData } = useData();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

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





export default function MensalidadeLista() {

  const { data } = useData();

  const navigate = useNavigate();

  console.log('data', data)

  return (
    <Grid container p={0} spacing={2}>
      <DataFetcher />

      <Typography textAlign={'end'} flexGrow={1}>{`Próximo vencimento ${new Date(data.lastPayment.seconds * 1000).toLocaleDateString()}`}</Typography>

      <TableContainer component={Paper} elevation={0}>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Descrição</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Valor</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.adm.payment
              .sort((a, b) => b.date.seconds - a.date.seconds)
              .map((row) => (
                <TableRow key={row.paymentId}
                  sx={{ '& > *': { borderBottom: 'unset' } }}
                >
                  <TableCell>
                    {row.description}
                  </TableCell>
                  <TableCell>
                    {new Date(row.date.seconds * 1000).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.value)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Grid>
  );
}
