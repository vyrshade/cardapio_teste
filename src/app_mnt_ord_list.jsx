import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Alert, Chip, Grid, LinearProgress } from '@mui/material';
import { fetchCollection, useMntUser } from './api';
import { useData } from './context';
import { useDialogs } from '@toolpad/core';
import React, { useState } from 'react';
import { useEffect } from 'react';










const useOrdFetcher = () => {
  const { setData } = useData();
  const { loading, claims } = useMntUser();
  const [error, setError] = useState(null);
  const [fetching, setFetching] = useState(loading);

  useEffect(() => {
    if (loading || !claims?.merchantId) return;

     // Calcula a data de 3 dias atrás em timestamp
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);
    const threeDaysAgoTimestamp = Math.floor(threeDaysAgo.getTime() / 1000);

    const unsubscribe = fetchCollection(
      claims.merchantId, 
      'order', 
      null/* , { status: ['PLACED', 'READY_TO_PICKUP', 'DISPATCHED'] } */,
      (data) => {
        // Filtra apenas pedidos dos últimos 3 dias
        const filteredData = data.filter(order => 
          order.createdAt.seconds >= threeDaysAgoTimestamp
        );

        //atualiza o estado
        setData((state) => ({
          ...state,
          mnt: {
            ...state.mnt,
            order: [...filteredData]
          }
        }));

        setFetching(false);
      },
      (error) => {
        setError(error);
        setFetching(false);
      }
    );

    return () => unsubscribe();
  }, [loading, claims, setData]);

  return { fetching: loading || fetching, error, claims };
};




function Row(props) {
  const { row } = props;

  const [open, setOpen] = useState(false);
    const dialogs = useDialogs();

  //const last_status = row.status_hist.sort((a, b) => a.createdAt.seconds - b.createdAt.seconds)[row.status_hist.length - 1];
  const last_status = [...row.status_hist]
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0];

    //Abre o dialog se o status for igual a cancelado
  const handleStatusClick = () => {
      if (last_status.id === 'CAN') {
        dialogs.alert(last_status.remarksCancel, {
        title: 'Motivo Do Cancelamento',
      });
    }
  };

  return (
    <React.Fragment>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>

        <TableCell align="left">{row.table.tableId}</TableCell>
        <TableCell align="left">{row.name}</TableCell>
        <TableCell align="left">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.price.value)}
        </TableCell>
        <TableCell align="left">
          <Chip
            label={`${last_status.label} em ${new Date(last_status.createdAt.seconds * 1000).toLocaleString()}`}
            color={last_status.color}
            clickable={last_status.id === 'CAN'}
            onClick={handleStatusClick}
          />
        </TableCell>
      </TableRow>

      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Table size="small" aria-label="purchases">
                <TableHead>
                  <TableRow>
                    <TableCell>status</TableCell>
                    <TableCell align="left">Usuário</TableCell>
                    <TableCell align="left">Data</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[...row.status_hist]
                    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
                    .map((item, id) => (
                      <TableRow key={id}>
                        <TableCell component="th" scope="row">
                          <Chip
                            label={item.label}
                            color={item.color}
                            onClick={() => { }}
                          />
                        </TableCell>
                        <TableCell component="th" scope="row">
                          {item.email}
                        </TableCell>
                        <TableCell component="th" scope="row">
                          {new Date(item.createdAt.seconds * 1000).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );

}







export default function PedidoLista() {

  const { data } = useData();

  const { fetching, error } = useOrdFetcher();

  if (fetching) return <LinearProgress variant='indeterminate' sx={{ width: '100%', height: 2 }} />;

  if (error) return (
    <Alert severity="error">
      <Box whiteSpace="pre-line">
        {error.message}
      </Box>
    </Alert>
  )

  return (
    <Grid container flexGrow={1}>
      <TableContainer component={Paper} elevation={0}>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell align="left">Histórico</TableCell>
              <TableCell align="left">Mesa</TableCell>
              <TableCell align="left">Produto</TableCell>
              <TableCell align="left">Valor</TableCell>
              <TableCell align="left">Status Atual</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {
              !data.mnt.order.length ?
                <TableRow>
                  <TableCell align="center" colSpan={5}>Nenhum registro</TableCell>
                </TableRow>
                :
                data.mnt.order
                  .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds)
                  .map((row) => (
                    <Row key={row.orderId} row={row} />
                  ))
            }
          </TableBody>
        </Table>
      </TableContainer>
    </Grid>
  );
}
