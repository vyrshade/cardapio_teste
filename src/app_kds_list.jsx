import {
  Alert,
  Box,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
} from '@mui/material';
import { useData } from './context';
import { fetchCollection, useKdsUser } from './api';
import { useNavigate } from 'react-router';
import { Search } from '@mui/icons-material';
import { useState } from 'react';
import { useEffect } from 'react';






const useKdsFetcher = () => {
  const { setData } = useData();
  const { claims, loading } = useKdsUser();
  const [state, setState] = useState({ fetching: true, error: null });


  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    let unsubKds = undefined

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
      unsubKds?.();
    };
  }, [loading, claims, setData]);

  return { ...state, claims };
};













export default function DisplayListaSelect() {

  const { data } = useData();

  const { fetching, error } = useKdsFetcher();

  const navigate = useNavigate();

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
      <TableContainer component={Paper} elevation={0}>
        <Typography textAlign={'start'} variant='body1' mb={2}>
          Escolher cozinha:
        </Typography>
        
        <Table size='small'>
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
                        <IconButton
                          onClick={() => navigate(`${row.kdsId}`)}
                        >
                          <Search />
                        </IconButton>
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