import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Alert, Box, Button, Grid, LinearProgress, Tooltip, Typography } from '@mui/material';
import { deleteDocument, fetchCollection, useMntUser } from './api';
import { useData } from './context';
import { useNavigate } from 'react-router';
import { DeleteForever, Edit } from '@mui/icons-material';
import { useDialogs } from '@toolpad/core';
import { ErrorDialog } from './shared';
import { useState } from 'react';
import { useEffect } from 'react';
import { ToggleButtonGroup, ToggleButton } from '@mui/material'; 





const usePdtFetcher = () => {
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







export default function ProdutoLista() {

  const { data } = useData();

  const navigate = useNavigate();

  const dialogs = useDialogs();

  const { fetching, error, claims } = usePdtFetcher();

  // Filtro de status (igual à tela de usuários)
  const [statusFilter, setStatusFilter] = useState('active');
  const handleFilterChange = (event, newFilter) => {
    if (newFilter !== null) {
      setStatusFilter(newFilter);
    }
  };

  // Helper para obter status booleano
  const getStatusBool = (row) => {
    if (typeof row?.status === 'boolean') return row.status;
    if (typeof row?.active === 'boolean') return row.active;
    return null;
  };

  // Lista filtrada de produtos
  const getFilteredProducts = () => {
    const items = data.mnt.item?.flatMap((i) => i.items) ?? [];
    let filtered = items;

    if (statusFilter === 'active') {
      filtered = filtered.filter((row) => getStatusBool(row) === true);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter((row) => getStatusBool(row) === false);
    }
    // 'all' não filtra

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  };

  const handleDelete = async (row) => {
    if (row.itemId) {
      const deleteConfirmed = await dialogs.confirm(
        `Deseja realmente excluir "${row.name}"?`, { title: 'Confirmar', severity: 'error', okText: 'Sim', cancelText: 'Não' }
      );
      if (deleteConfirmed) {
        try {
          //verifica impedimentos
          /* const item = data.mnt.item
            .flatMap((i) => i.items)
            .filter((i) => i.item.itemId === row.itemId);

          if (!!item.length) {
            throw new Error(`Existe ${item.length} produto(s) relacionado(s) a categoria ${row.name}.`);
          } */

          ////////EXCLUIR A IMAGEM!!!!

          //....
          await deleteDocument(claims.merchantId, 'item', row.itemId);

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

  const filteredProducts = getFilteredProducts();

  return (
    <Grid container spacing={2}>
      <Box display="flex" justifyContent="space-between" alignItems="center" width="100%" mb={2}>
        <Button
          variant='contained'
          onClick={() => navigate('0')}
        >
          Incluir
        </Button>

        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={handleFilterChange}
          aria-label="filtro de status"
          size="small"
        >
          <ToggleButton value="active" aria-label="ativos">
            Ativos
          </ToggleButton>
          <ToggleButton value="inactive" aria-label="inativos">
            Inativos
          </ToggleButton>
          <ToggleButton value="all" aria-label="todos">
            Todos
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <TableContainer component={Paper} elevation={0}>
        <Table size='small'>
          <TableHead>
            <TableRow>
              <TableCell>Ação</TableCell>
              <TableCell>Nome</TableCell>
              <TableCell>Categoria</TableCell>
              <TableCell>Preço</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {
              !filteredProducts.length ?
                <TableRow>
                  <TableCell align='center' colSpan={5}>Nenhum registro</TableCell>
                </TableRow>
                :
                filteredProducts.map((row) => {
                  const statusBool = getStatusBool(row);
                  return (
                    <TableRow key={row.itemId}
                      sx={{ '& > *': { borderBottom: 'unset' } }}
                    >
                      <TableCell>
                        <Tooltip title="Editar">
                          <IconButton
                            onClick={() => navigate(`${row.itemId}`)}
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
                      <TableCell>
                        {row.name}
                      </TableCell>
                      <TableCell>
                        {row.category.name}
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.price.value)}
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ color: statusBool === true ? 'success.main' : statusBool === false ? 'error.main' : 'text.secondary' }}>
                          {statusBool === null ? '—' : statusBool ? 'Ativo' : 'Inativo'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })
            }
          </TableBody>
        </Table>
      </TableContainer>
    </Grid>
  );
}
