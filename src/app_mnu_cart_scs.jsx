import {
  Box, Grid, IconButton,
  Paper, Typography, Zoom
} from '@mui/material';
import { useNavigate, useParams } from 'react-router';
import { ArrowBack, CheckCircle } from '@mui/icons-material';





export default function CartSuccess() {
  const navigate = useNavigate();
  const params = useParams();

  return (
    <Grid container
      sx={{
        p: 1,
        flexDirection: 'column',
        flexGrow: 1,
        //justifyContent: 'space-between'
        height: '80vh'
      }}
    >



      <Paper variant='outlined'>
        <Grid container alignItems={'center'}>
          <IconButton onClick={() => navigate(`/mnu/${params.merchantId}/${params.tableId}`)}>
            <ArrowBack />
          </IconButton>
          <Typography>Voltar para o cardápio</Typography>
        </Grid>
      </Paper>

      <Grid
        container
        flexGrow={1}
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        p={2}
      >
        <CheckCircle color="success" sx={{ fontSize: 50 }} />
        <Typography variant="h6" color="text.secondary" mt={2}>
          Pedido realizado
        </Typography>
      </Grid>


    </Grid>

  );
}