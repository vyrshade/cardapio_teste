import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Alert, Grid, LinearProgress } from '@mui/material';
import { listenAdmConfigDoc } from './api';
import { useData } from './context';
import { useState } from 'react';
import { useEffect } from 'react';
import { Edit } from '@mui/icons-material';
import { useNavigate } from 'react-router';



const useModFetcher = () => {
  const { setData } = useData();
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = listenAdmConfigDoc(
      data => {
        setData(state => ({
          ...state,
          adm: {
            ...state.adm,
            ...data
          }
        }));
        setFetching(false);
      },
      err => {
        setError(err);
        setFetching(false);
      }
    );

    return () => unsubscribe();
  }, [setData]);


  return { fetching, error };
};






export default function ModuloLista() {

  const { data } = useData();

  const { fetching, error } = useModFetcher();

  const navigate = useNavigate();

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
              <TableCell>Ação</TableCell>
              <TableCell align="left">Nome</TableCell>
              <TableCell align="left">Valor mensal</TableCell>
              <TableCell align="left">Teste (dias)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {
              !data.adm.module.length ?
                <TableRow>
                  <TableCell align="center" colSpan={5}>Nenhum registro</TableCell>
                </TableRow>
                :
                data.adm.module
                  .sort((a, b) => a.moduleId - b.moduleId)
                  .map((row) => (
                    <TableRow key={row.moduleId}>
                      <TableCell>
                        <IconButton
                          onClick={() => navigate(`${row.moduleId}`)}
                        >
                          <Edit />
                        </IconButton>
                      </TableCell>
                      <TableCell align="left">{row.name}</TableCell>
                      <TableCell align="left">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.monthlyAmount)}
                      </TableCell>
                      <TableCell align="left">{row.testDays}</TableCell>
                    </TableRow>
                  ))
            }
          </TableBody>
        </Table>
      </TableContainer>
    </Grid>
  );
}
