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





const useOptFetcher = () => {
  const { setData } = useData();
  const { loading, claims } = useMntUser();
  const [error, setError] = useState(null);
  const [fetching, setFetching] = useState(loading);

  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    const unsubscribe = fetchCollection(
      claims.merchantId,
      'option',
      null,
      (data) => {
        setData((prev) => ({
          ...prev,
          mnt: {
            ...prev.mnt,
            option: data,
          },
        }));

        setFetching(false);
      },
      (err) => {
        setError(err);
        setFetching(false);
      }
    );

    return () => unsubscribe();
  }, [loading, claims, setData]);

  return { fetching: loading || fetching, error, claims };
};








export default function ComplementoLista() {

  const { data } = useData();

  const navigate = useNavigate();

  const dialogs = useDialogs();

  const { fetching, error, claims } = useOptFetcher();

  const handleDelete = async (row) => {
    if (row.optionId) {
      const deleteConfirmed = await dialogs.confirm(
        `Deseja realmente excluir "${row.name}"?`, { title: 'Confirmar', severity: 'error', okText: 'Sim', cancelText: 'Não' }
      );
      if (deleteConfirmed) {
        try {
          //verifica impedimentos
          /*  const item = data.mnt.item
             .flatMap((i) => i.items)
             .filter((i) => i.option.optionId === row.optionId);
 
           if (!!item.length) {
             throw new Error(`Existe ${item.length} produto(s) relacionado(s) a categoria ${row.name}.`);
           } */

          //....
          await deleteDocument(claims.merchantId, 'option', row.optionId);

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
  )

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
              !data.mnt.option.length ?
                <TableRow>
                  <TableCell align='center' colSpan={2}>Nenhum registro</TableCell>
                </TableRow>
                :
                data.mnt.option
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((row) => (
                    <TableRow key={row.optionId}
                      sx={{ '& > *': { borderBottom: 'unset' } }}
                    >
                      <TableCell>
                        <Tooltip title="Editar">
                          <IconButton
                            onClick={() => navigate(`${row.optionId}`)}
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
