import * as React from 'react';
import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Button, Grid } from '@mui/material';
import { fetchCollection } from './api';
import { useData } from './context';
import { useNavigate } from 'react-router';
import { Edit } from '@mui/icons-material';





const DataFetcher = () => {
  const { setData } = useData();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {

    const unsubscribe = fetchCollection('optionGroup', null,
      (data) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          mnt: {
            ...state.mnt,
            optionGroup: [...data]
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






export default function ComplementoGrupoLista() {

  const { data } = useData();

  const navigate = useNavigate();

  return (
    <Grid container p={0} spacing={2}>
      <DataFetcher />

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
              !data.mnt.optionGroup.length ?
                <TableRow>
                  <TableCell align='center' colSpan={2}>Nenhum registro</TableCell>
                </TableRow>
                :
                data.mnt.optionGroup
                  .map((row) => (
                    <TableRow key={row.optionGroupId}
                      sx={{ '& > *': { borderBottom: 'unset' } }}
                    >
                      <TableCell>
                        <IconButton
                          onClick={() => navigate(`${row.optionGroupId}`)}
                        >
                          <Edit />
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
