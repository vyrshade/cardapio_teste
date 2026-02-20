import {
  Box,
  Typography,
  TableHead,
  TableContainer,
  Table,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  IconButton,
} from '@mui/material';
import { Grid } from '@mui/system';
import { useNavigate, useOutletContext } from 'react-router';
import { format } from 'date-fns';
import { Edit } from '@mui/icons-material';
import { translateEvent } from './utils/translateEvent';







export default function MerchantModuloLista() {

  const { watch } = useOutletContext();

  const navigate = useNavigate();

  const module = watch('module');

  return (
    <Grid container>
      <Grid size={10}>
        <Box flexGrow={1}>
          <Typography variant='caption' color='text.secondary' gutterBottom>
            Módulos
          </Typography>
          <TableContainer component={Paper} elevation={0} variant='outlined'>
            <Table size='small'
              sx={{
                '& tbody tr:last-child td': {
                  borderBottom: 0,

                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>Ação</TableCell>
                  <TableCell align="left">Nome</TableCell>
                  <TableCell align="left">Ativo</TableCell>
                  <TableCell align="left">Valor mensal</TableCell>
                  <TableCell align="left">Assinatura</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {
                  !module.length ?
                    <TableRow>
                      <TableCell align="center" colSpan={5}>Nenhum registro</TableCell>
                    </TableRow>
                    :
                    module
                      .sort((a, b) => a.moduleId - b.moduleId)
                      .map((row) => {

                        let status = '**';

                        if (row.subscriptionId) {
                          status = translateEvent('ACTIVE');
                        }
                        if (row.subscriptionInactivated) {
                          status = translateEvent('INACTIVE');
                        }

                        if (!row.subscriptionId && !row.subscriptionInactivated && row.testDueDate) {
                          status = `Teste vence ${format(new Date(row.testDueDate?.seconds * 1000), 'dd/MM/yyyy')}`;
                        }

                        if (!row.monthlyAmount) {
                          status = 'Gratuito';
                        }

                        return (
                          <TableRow key={row.moduleId}>
                            <TableCell>
                              <IconButton
                                onClick={() => navigate(`mdl/${row.moduleId}`)}
                              >
                                <Edit />
                              </IconButton>
                            </TableCell>
                            <TableCell align="left">{row.name}</TableCell>
                            <TableCell align="left">{row.enabled ? 'Sim' : 'Não'}</TableCell>
                            <TableCell align="left">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.monthlyAmount)}
                            </TableCell>
                            <TableCell align="left">{status}</TableCell>
                          </TableRow>
                        )
                      })
                }
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Grid>
    </Grid>
  );
}