import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Alert, Box, Button, Grid, LinearProgress, Tooltip } from '@mui/material';
import { deleteDocument, fetchCollection, useMntUser } from './api';
import { useData } from './context';
import { useNavigate } from 'react-router';
import { DeleteForever, Edit } from '@mui/icons-material';
import { useDialogs } from '@toolpad/core';
import { ErrorDialog } from './shared';
import { useState } from 'react';
import { useEffect } from 'react';
import { ToggleButtonGroup, ToggleButton } from '@mui/material'; 





const useCtgFetcher = () => {
  const { setData } = useData();
  const { claims, loading } = useMntUser();
  const [state, setState] = useState({ fetching: true, error: null });


  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    let unsubItem = undefined
    let unsubCtg = undefined

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

    //category
    unsubCtg = fetchCollection(claims.merchantId, 'category', null,
      (category) => {
        setData(state => ({
          ...state,
          mnt: { ...state.mnt, category }
        }));
        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    return () => {
      unsubItem?.();
      unsubCtg?.();
    };
  }, [loading, claims, setData]);

  return { ...state, claims };
};







export default function CategoriaLista() {

  const { data } = useData();

  const navigate = useNavigate();

  const dialogs = useDialogs();

  const { fetching, error, claims } = useCtgFetcher();

  const handleDelete = async (row) => {
    if (row.categoryId) {
      const deleteConfirmed = await dialogs.confirm(
        `Deseja realmente excluir "${row.name}"?`, { title: 'Confirmar', severity: 'error', okText: 'Sim', cancelText: 'Não' }
      );
      if (deleteConfirmed) {
        try {
          //verifica impedimentos
          const item = data.mnt.item
            .flatMap((i) => i.items)
            .filter((i) => i.category.categoryId === row.categoryId);

          if (!!item.length) {
            throw new Error(`Existe ${item.length} produto(s) relacionado(s) a categoria ${row.name}.`);
          }

          //....
          await deleteDocument(claims.merchantId, 'category', row.categoryId);

        } catch (error) {
          const err = error instanceof Error ? error.message : 'Erro desconhecido';
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
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {
              !data.mnt.category.length ?
                <TableRow>
                  <TableCell align='center' colSpan={3}>Nenhum registro</TableCell>
                </TableRow>
                :
                data.mnt.category
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((row) => (
                    <TableRow key={row.categoryId}
                      sx={{ '& > *': { borderBottom: 'unset' } }}
                    >
                      <TableCell>
                        <Tooltip title="Editar">
                          <IconButton
                            onClick={() => navigate(`${row.categoryId}`)}
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
                      <TableCell>
                        <Box sx={{ color: row.status ? 'success.main' : 'error.main' }}>
                          {row.status ? 'Ativo' : 'Inativo'}
                        </Box>
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
