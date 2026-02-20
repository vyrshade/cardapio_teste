import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import { Alert, Box, Chip, Grid, LinearProgress } from '@mui/material';
import { fetchCollection, updateDocument, useWtrUser } from './api';
import { useData } from './context';
import { Timestamp } from 'firebase/firestore';
import { Restore } from '@mui/icons-material';
import React from 'react';
import { useState } from 'react';
import { useEffect } from 'react';






const useWtrFetcher = () => {
  const { data, setData } = useData();
  const { claims, loading } = useWtrUser();
  const [state, setState] = useState({ fetching: true, error: null });
  const [userListenStatus, setUserListenStatus] = useState(null);

  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    const unsubscribe = fetchCollection(claims.merchantId, 'order_status', null,
      (statusData) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          wtr: {
            ...state.wtr,
            order_status: [...statusData],
          },
        }));
      },
      (error) => setState({ fetching: false, error })
    );

    return () => unsubscribe();
  }, [loading, claims, setData]);


  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    const unsubscribe = fetchCollection(claims.merchantId, 'order', { 'status': ['DIS', 'CAN',] },
      (data) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          wtr: {
            ...state.wtr,
            order_hist: [...data]
          }
        }));

        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    return () => unsubscribe();
  }, [data.wtr.order_status, loading, claims, setData]);




  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    const unsubUsr = fetchCollection(claims.merchantId, 'user', { token: claims.token },
      (data) => {
        setUserListenStatus({ ...data?.[0] })
        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    return () => {
      unsubUsr();
    };
  }, [loading, claims, setData]);

  return { ...state, claims, userListenStatus };
};





function Row(props) {
  const { row, claims, userListenStatus } = props;

  //modifica status
  /*   const handleChangeOrderStatus = async (order) => {
  
      const penultimo = order.status_hist.length >= 2 ? order.status_hist[order.status_hist.length - 2] : undefined;
  
      if (penultimo) {
        const orderUp = {
          status: penultimo.id,
          status_hist: arrayUnion({
            ...penultimo,
            createdAt: Timestamp.now(),
            //email: claims.email || 'n/d'
            email: userListenStatus.name
          })
        }
  
        //const orderId =
        await updateDocument(claims.merchantId, 'order', order.orderId, orderUp);
      }
    } */


  const handleChangeOrderStatus = async (order) => {
    if (!order?.status_hist?.length) return;

    const newHist = [...order.status_hist]
      .sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis())

    const lastIndex = newHist.length - 1;
    newHist[lastIndex] = {
      ...newHist[lastIndex],
      reverted: true,
    };

    if (newHist.length < 2) return;

    const penultimo = newHist[newHist.length - 2];

    newHist.push({
      ...penultimo,
      createdAt: Timestamp.now(),
      email: userListenStatus.name,
    });

    await updateDocument(claims.merchantId, 'order', order.orderId, {
      status: penultimo.id,
      status_hist: newHist,
    });
  };

  return (
    <React.Fragment>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton color='warning' variant='outlined'
            onClick={() => handleChangeOrderStatus(row)}
          >
            <Restore />
          </IconButton>
        </TableCell>
        <TableCell align='right'>{row.table.tableId}</TableCell>
        <TableCell>
          <Typography>
            {row.name}
          </Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={`${row.status_hist[row.status_hist.length - 1].label}`}
            color={row.status_hist[row.status_hist.length - 1].color}
            onClick={() => { }}
          />
        </TableCell>

      </TableRow>
    </React.Fragment>
  );
}







export default function GarçomHist() {

  const { data } = useData();

  const { claims, error, fetching, userListenStatus } = useWtrFetcher();

  if (fetching) return <LinearProgress variant='indeterminate' sx={{ width: '100%', height: 2 }} />;

  if (error) return (
    <Alert severity="error">
      <Box whiteSpace="pre-line">
        {error.message}
      </Box>
    </Alert>
  );

  return (
    <Grid container flexGrow={1} p={0}>
      <TableContainer component={Paper} elevation={0}>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Ação</TableCell>
              <TableCell>Mesa</TableCell>
              <TableCell>Produto</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {
              !data.wtr.order_hist.length ?
                <TableRow>
                  <TableCell align='center' colSpan={4}>Nenhum registro</TableCell>
                </TableRow>
                :
                data.wtr.order_hist.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds).map((row) => (
                  <Row key={row.orderId} row={row} claims={claims} userListenStatus={userListenStatus} />
                ))
            }
          </TableBody>
        </Table>
      </TableContainer>
    </Grid>
  );
}
