import {
  Alert,
  Box,
  Button,
  IconButton,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Toolbar,
  Tooltip,
} from '@mui/material';
import { Grid } from '@mui/system';
import { useNavigate } from 'react-router';
import { fetchCollection, useMntUser } from './api';
import { useData } from './context';
import Typography from '@mui/material/Typography';
import { QRCodeSVG } from 'qrcode.react';
import PrintIcon from '@mui/icons-material/Print';
import { useState } from 'react';
import { useEffect } from 'react';
import { ToggleButtonGroup, ToggleButton } from '@mui/material'; 





const useTblFetcher = () => {
  const { setData } = useData();
  const { loading, claims } = useMntUser();
  const [error, setError] = useState(null);
  const [fetching, setFetching] = useState(loading);

  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    const unsubscribe = fetchCollection(
      claims.merchantId,
      'table',
      null,
      (data) => {
        const range = data.length ? data[0] : { numStart: 0, numEnd: 0 };

        setData((prev) => ({
          ...prev,
          mnt: {
            ...prev.mnt,
            table: range,
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






export default function Mesa() {

  const { data } = useData();

  const navigate = useNavigate();

  const start = Number(data.mnt.table.numStart);

  const end = Number(data.mnt.table.numEnd);

  const arr = [...Array(end - start + 1)].map((_, i) => start + i);

  const table_editing = data.mnt.table?.tableId;

  const { fetching, error, claims } = useTblFetcher();

  const handlePrint = (numMesa) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.writeln(`
      <html>
        <head>
          <title>Imprimir QR Code</title>
          <style>
            body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: sans-serif; }
            .content { text-align: center; }
          </style>
        </head>
        <body>
          <div class="content">
            <h2>Mesa: ${numMesa}</h2>
            ${document.getElementById(`qr-${numMesa}`).outerHTML}
          </div>
          <script>
            window.onload = () => window.print();
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
        onClick={() => navigate(table_editing || '0')}
      >
        {table_editing ? 'Editar' : 'Incluir'}
      </Button>


      <Grid container size={12}>
        {
          !data.mnt.table?.tableId ?
            <TableContainer component={Paper} elevation={0}>
              <Table size='small'>
                <TableBody>
                  <TableRow>
                    <TableCell align='center'>
                      Nenhuma mesa cadastrada.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            :
            arr
              .map((m) => (
                <Grid key={m} size={{ xs: 12, md: 6, lg: 4 }}>
                  <Paper variant='outlined'
                    sx={{
                      p: 2,
                      display: 'flex',
                      flexGrow: 1,
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <Tooltip title="Imprimir">
                      <IconButton onClick={() => handlePrint(m)}>
                        <PrintIcon fontSize='large' />
                      </IconButton>
                    </Tooltip>

                    <Typography variant='h3' color='primary'>
                      {`${m}`}
                    </Typography>

                    <div>
                      <QRCodeSVG id={`qr-${m}`} value={`${import.meta.env.VITE_APP_URL}/mnu/${claims?.merchantId}/${m}/1`} size={110} />
                    </div>
                  </Paper>
                </Grid>
              ))
        }

      </Grid>

    </Grid>
  );
}
