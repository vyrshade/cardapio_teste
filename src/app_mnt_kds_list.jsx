import {
  Alert,
  Box,
  Button,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import { useData } from './context';
import { deleteDocument, fetchCollection, useMntUser } from './api';
import { useNavigate } from 'react-router';
import { DeleteForever, Edit } from '@mui/icons-material';
import { useDialogs } from '@toolpad/core';
import { ErrorDialog } from './shared';
import { useState } from 'react';
import { useEffect } from 'react';
import { translateError } from './utils/translateError';
import { ToggleButtonGroup, ToggleButton } from '@mui/material'; 




const useKdsFetcher = () => {
  const { setData } = useData();
  const { claims, loading } = useMntUser();
  const [state, setState] = useState({ fetching: true, error: null });


  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    let unsubItem = undefined
    let unsubKds = undefined

    //items
    unsubItem = fetchCollection(claims.merchantId, 'item', null,
      (data) => {
        const grouped = Object.values(
          data.reduce((acc, item) => {
            const { categoryId, name } = item.category;

            if (!acc[categoryId]) {
              acc[categoryId] = { categoryId, name, items: [] };
            }

            acc[categoryId].items.push(item);
            return acc;
          }, {})
        );

        //atualiza o estado
        setData((state) => ({
          ...state,
          mnt: {
            ...state.mnt,
            item: [...grouped]
          }
        }));
      },
      (error) => setState({ fetching: false, error })
    );

    //kds
    unsubKds = fetchCollection(claims.merchantId, 'kds', null,
      (kds) => {
        setData(state => ({
          ...state,
          mnt: { ...state.mnt, kds }
        }));
        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    return () => {
      unsubItem?.();
      unsubKds?.();
    };
  }, [loading, claims, setData]);

  return { ...state, claims };
};









export default function DisplayLista() {

  const { data } = useData();

  const navigate = useNavigate();

  const dialogs = useDialogs();

  const { fetching, error, claims } = useKdsFetcher();

  const handleDelete = async (row) => {
    if (row.kdsId) {
      const deleteConfirmed = await dialogs.confirm(
        `Deseja realmente excluir "${row.name}"?`, { title: 'Confirmar', severity: 'error', okText: 'Sim', cancelText: 'Não' }
      );
      if (deleteConfirmed) {
        try {
          //verifica impedimentos
          const item = data.mnt.item
            .flatMap((i) => i.items)
            .filter((i) => i.kds.kdsId === row.kdsId);

          if (!!item.length) {
            throw new Error(`Existe ${item.length} produto(s) sendo exibido(s) em ${row.name}.`);
          }

          //....
          await deleteDocument(claims.merchantId, 'kds', row.kdsId);

        } catch (error) {
          console.log('error', error)
          const err = error instanceof Error ? translateError(error) : 'Erro desconhecido';
          const message = `Ocorreu um erro ao tentar excluir:\n\n${err}`;
          await dialogs.open(ErrorDialog, { textError: message });
        }
      }
    }
  };

  if (fetching) return <LinearProgress variant='indeterminate' sx={{ width: '100%', height: 2 }} />;

  if (error) return (
    <Alert severity="error">
      <Box whiteSpace="pre-line">
        {error.message}
      </Box>
    </Alert>
  );

  return (
    <Grid container spacing={2}>
      <Button
        variant='contained'
        onClick={() => navigate('0')}
      >
        Incluir
      </Button>

      <TableContainer component={Paper} elevation={0}>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Ação</TableCell>
              <TableCell>Nome</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {
              !data.mnt.kds.length ?
                <TableRow>
                  <TableCell align='center' colSpan={2}>Nenhum registro</TableCell>
                </TableRow>
                :
                data.mnt.kds
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((row) => (
                    <TableRow key={row.kdsId}
                      sx={{ '& > *': { borderBottom: 'unset' } }}
                    >
                      <TableCell>
                        <Tooltip title="Editar">
                          <IconButton
                            onClick={() => navigate(`${row.kdsId}`)}
                          >
                            <Edit />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Excluir">
                          <IconButton
                            onClick={() => handleDelete(row)}
                          >
                            <DeleteForever color='error' />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                      <TableCell component="th" scope="row">
                        {row.name}
                      </TableCell>
                    </TableRow>
                  ))
            }
          </TableBody>
        </Table>
      </TableContainer>
    </Grid>
  );
}