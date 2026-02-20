import IconButton from '@mui/material/IconButton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, LinearProgress, Typography } from '@mui/material';
import { deleteDocument, fetchCollection, useMntUser } from './api';
import { useData } from './context';
import { useNavigate } from 'react-router';
import { DeleteForever, Edit, QrCode2Sharp, ShareTwoTone } from '@mui/icons-material';
import { useDialogs } from '@toolpad/core';
import { ErrorDialog } from './shared';
import { useEffect, useRef } from 'react';
import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Tooltip } from '@mui/material';
import { ToggleButtonGroup, ToggleButton } from '@mui/material'; 






const useUsrFetcher = () => {
  const { setData } = useData();
  const { claims, loading } = useMntUser();
  const [state, setState] = useState({ fetching: true, error: null });


  useEffect(() => {
    if (loading || !claims?.merchantId) return;

    const unsubscribe = fetchCollection(claims.merchantId, 'user', null,
      (data) => {
        //atualiza o estado
        setData((state) => ({
          ...state,
          mnt: {
            ...state.mnt,
            user: [...data]
          }
        }));

        setState({ fetching: false, error: null });
      },
      (error) => setState({ fetching: false, error })
    );

    return () => unsubscribe();
  }, [loading, claims, setData]);

  return { ...state, claims };
};









export function QrDialog({ open, onClose, payload }) {
  const { claims } = useMntUser();

  const { data } = useData();

  const [ttl, setTtl] = useState(`Autenticar ${payload.name}`)

  const url = `${import.meta.env.VITE_APP_URL}/usr/auth/${claims?.merchantId}/${payload.token}/${payload.type}`;

  const userRefresh = data.mnt.user.find((i) => i.userId === payload.userId);

  const prevLengthRef = useRef(-1);

  const devicesLength = userRefresh?.devices?.length ?? 0;

  useEffect(() => {
    if (prevLengthRef.current !== -1 && prevLengthRef.current !== devicesLength) {
      setTtl(`${payload.name} conectado!`);
      setTimeout(() => {
        onClose();
      }, 1000);
    }

    prevLengthRef.current = devicesLength;
  }, [devicesLength]);



  return (
    <Dialog open={open} onClose={() => onClose()}>
      <DialogTitle textAlign={'center'}>
        <Typography variant='h6' component="div" color='text.primary'>

          {ttl}
        </Typography>
        <Typography variant='body1' color='text.secondary'>
          {`O colaborador deve escanear para fazer login no aplicativo.`}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ display: 'flex', justifyContent: 'center' }}>
        <QRCodeSVG id={`qr-${payload.token}`} value={url} size={256} />
      </DialogContent>
      <DialogActions>
        <Button variant='outlined' fullWidth color='inherit' onClick={() => onClose()}>Cancelar</Button>
      </DialogActions>
    </Dialog>
  );
}


export default function UsuarioLista() {

  const { data } = useData();

  const navigate = useNavigate();

  // Estado para controlar o filtro (padrão: 'active')
  const [statusFilter, setStatusFilter] = useState('active');

  const levelMap = {
    adm: 'Administrador',
    kds: 'Cozinha',
    wtr: 'Garçom'
  }

  const dialogs = useDialogs();

  const { fetching, error, claims } = useUsrFetcher();

  const handleDelete = async (row) => {
    if (row.userId) {
      const deleteConfirmed = await dialogs.confirm(
        `Deseja realmente excluir '${row.name}'?`, { title: 'Confirmar', severity: 'error', okText: 'Sim', cancelText: 'Não' }
      );
      if (deleteConfirmed) {
        try {
          const merchantId = claims?.merchantId;

          if (!merchantId) throw new Error('id do estabelecimento não encontrado');

          //....
          await deleteDocument(merchantId, 'user', row.userId);

        } catch (error) {
          const err = error instanceof Error ? error.message : 'Erro desconhecido';
          const message = `Ocorreu um erro ao tentar excluir:\n\n${err}`;
          await dialogs.open(ErrorDialog, { textError: message });
        }
      }
    }
  };

  const handleQR = async (row) => {
    await dialogs.open(QrDialog, { ...row });
  };

  // Função para tratar a mudança de filtro
  const handleFilterChange = (event, newFilter) => {
    if (newFilter !== null) {
      setStatusFilter(newFilter);
    }
  };

  // Função para filtrar usuários baseado no status
  const getFilteredUsers = () => {
    if (!data.mnt.user) return [];
    
    let filtered = data.mnt.user;
    
    if (statusFilter === 'active') {
      filtered = filtered.filter(user => user.status === true);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(user => user.status === false);
    }
    // se for 'all', retorna todos sem filtrar
    
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  };

  /* function handleCopyToClipboard(token, type) {
    const url = `${import.meta.env.VITE_APP_URL}/usr/auth/${claims?.merchantId}/${token}/${type}`;

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(url).catch((err) => {
        console.error('Erro ao copiar com Clipboard API:', err);
      });
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();

      try {
        // @ts-ignore: fallback
        document.execCommand('copy');
      } catch (err) {
        console.warn('execCommand falhou:', err);
      }

      document.body.removeChild(textarea);
    }
  } */

  function handleShare(token, type) {
    const shareData = {
      title: 'Peça Já',
      text: 'Permitir que o colaborador faça login',
      url: `${import.meta.env.VITE_APP_URL}/usr/auth/${claims?.merchantId}/${token}/${type}`,
    };

    console.log('shareData', shareData);
    
    if (navigator.share) {
      navigator.share(shareData)
        .then(() => console.log('Compartilhado com sucesso'))
        .catch((err) => console.error('Erro ao compartilhar', err));
    } else {
      //caso nao tenha suporte a api padrao
      window.open(
        `mailto:?subject=${encodeURIComponent(shareData.title)}&body=${encodeURIComponent(shareData.text + '\n\n' + shareData.url)}`
      );
    }
  }


  if (fetching) return <LinearProgress variant='indeterminate' sx={{ width: '100%', height: 2 }} />;

  if (error) return (
    <Alert severity='error'>
      <Box whiteSpace='pre-line'>
        {error.message}
      </Box>
    </Alert>
  );

  // Obtém a lista filtrada de usuários
  const filteredUsers = getFilteredUsers();

  return (
    <Grid container spacing={2}>
      {}
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
              <TableCell>Acesso</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {
              !filteredUsers.length ?
                <TableRow>
                  <TableCell align='center' colSpan={4}>Nenhum registro</TableCell>
                </TableRow>
                :
                filteredUsers.map((row) => (
                  <TableRow key={row.userId}
                    sx={{ '& > *': { borderBottom: 'unset' } }}
                  >
                    <TableCell>
                      <Tooltip title="Editar">
                        <IconButton
                          onClick={() => navigate(`${row.userId}`)}
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
                      <Tooltip title="Compartilhar Acesso">
                        <IconButton
                          onClick={() => handleShare(row.token, row.type)}
                        >
                          <ShareTwoTone color='inherit' />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Escanear QR Code">
                        <IconButton
                          onClick={() => handleQR(row)}
                        >
                          <QrCode2Sharp color={!!row.devices?.length ? 'primary' : 'inherit'} />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      {row.name}
                    </TableCell>
                    <TableCell>
                      {levelMap[row.type]}
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ color: row.status ? 'success.main' : 'error.main' }}>
                        {row.status ? 'Ativo' : 'Inativo'}
                      </Typography>
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