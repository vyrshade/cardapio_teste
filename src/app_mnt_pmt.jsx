import * as React from 'react';
import {
  TableContainer,
  TableBody,
  TableCell,
  TableHead,
  Grid,
  Paper,
  Alert,
  LinearProgress,
  Button,
  Switch,
  Box,
  FormControlLabel,
} from '@mui/material';
import { useState } from 'react';
import { addDocument, deleteDocument, fetchCollection, SYS_ORDER_STATUS, updateMerchant, useMntUser } from './api';
import { useData } from './context';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import { useEffect } from 'react';









const usePmtFetcher = () => {
  const { setData } = useData();
  const { loading, claims } = useMntUser();
  const [error, setError] = useState(null);
  const [fetching, setFetching] = useState(loading);

  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    const unsubscribe = fetchCollection(claims.merchantId, 'order_status', null,
      (data) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          mnt: {
            ...state.mnt,
            order_status: [...data]
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














export default function ParametroSistema() {

  const { data } = useData();

  const [selected, setSelected] = useState([]);

  const [order_status_list, setOrder_status_list] = useState([]);

  const { fetching, error, claims } = usePmtFetcher();

  const rtp_status = order_status_list.find((s) => s.id === 'RTP');

  const module_menu_interativo = data.module?.find(m => m.moduleId === 2);

  //marca ou desmarca opcao selecionada
  const handleClick = async (_, option) => {
    if (option.active) return;

    const selectedIndex = selected.findIndex((i) => i.id === option.id);

    if (selectedIndex === -1) {
      //inclui
      await addDocument(claims.merchantId, 'order_status', option);

      if (option.id === 'SPS' && rtp_status) {
        //inclui RTP tbm
        await addDocument(claims.merchantId, 'order_status', rtp_status);
      }
    } else {
      //remove
      await deleteDocument(claims.merchantId, 'order_status', option.order_statusId);

      if (option.id === 'SPS' && rtp_status) {
        //remove RTP tbm
        await deleteDocument(claims.merchantId, 'order_status', rtp_status.order_statusId);
      }
    }
  };



  const onChange = async (checked) => {
    try {
      await updateMerchant(claims.merchantId, { mnu_interactive_enabled: checked })
    } catch (error) {
      console.log("error", error);
    }
  };

  useEffect(() => {
    setSelected([
      ...SYS_ORDER_STATUS.filter((s) => s.active === true),
      ...data.mnt.order_status])
  }, [data.mnt.order_status])


  useEffect(() => {

    const combined = [
      ...SYS_ORDER_STATUS,
      ...data.mnt.order_status
    ];

    const unique = Array.from(
      new Map(combined.map(item => [item.id, item])).values()
    );

    setOrder_status_list(unique);

  }, [data.mnt.order_status])

  if (fetching) return <LinearProgress variant='indeterminate' sx={{ width: '100%', height: 2 }} />;

  if (error) return (
    <Alert severity="error">
      <Box whiteSpace="pre-line">
        {error.message}
      </Box>
    </Alert>
  )

  return (
    <Grid container spacing={2} direction={'column'}>
      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell colSpan={7} sx={{ pl: 0 }}>
                <Typography variant='h6'>
                  {'Status do Pedido'}
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>


          <TableBody>
            {order_status_list
              .sort((a, b) => a.sequence - b.sequence)
              .filter((s) => s.id !== 'RTP')
              .map((option, index) => {
                const isItemSelected = selected.findIndex((i) => i.id === option.id) !== -1;

                let label = option.label;

                if (option.id === 'SPS') {
                  label = label + ' / ' + rtp_status.label;
                }

                return (
                  <TableRow
                    key={option.id}
                    hover
                    onClick={(event) => handleClick(event, option)}
                    role="checkbox"
                    tabIndex={-1}
                    //selected={isItemSelected}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        color="primary"
                        checked={isItemSelected}
                        disabled={option.active}
                      />
                    </TableCell>
                    <TableCell
                      component="th"
                      scope="row"
                      padding="none"
                    >
                      {label}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>

      {module_menu_interativo?.enabled &&
        <Box>
          <Typography variant='h6'>
            {module_menu_interativo.name}
          </Typography>

          <FormControlLabel
            control={
              <Switch
                checked={!!data?.mnu_interactive_enabled}
                onChange={(e) => onChange(e.target.checked)}
              />
            }
            label='Ativo'
          />
        </Box>
      }
    </Grid >
  );
}
