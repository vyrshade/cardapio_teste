import { Controller } from 'react-hook-form';
import {
  TextField,
  Box,
  FormGroup,
  FormControlLabel,
  Switch,
  Typography,
} from '@mui/material';
import { Grid } from '@mui/system';
import { useOutletContext, useParams } from 'react-router';
import { NumericFormat } from 'react-number-format';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';









export default function MerchantModuloForm() {

  const params = useParams();

  const { watch, control, errors, setValue, getValues } = useOutletContext();

  const items = watch('module');

  const index = items?.findIndex(m => m.moduleId === Number(params.moduleId));

  if (index === -1) return null;

  const subscriptionId = watch(`module.${index}.subscriptionId`);

  return (
    <Grid container spacing={2}>

      <Grid size={10}>
        <Box>
          <Typography variant='caption' color='text.secondary' gutterBottom>
            Módulo
          </Typography>
          <Box
            sx={{
              border: '1px solid #ccc',
              borderRadius: 1,
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Typography variant='body1' color='text.primary' fontWeight={500}>
              {watch(`module.${index}.name`)}
            </Typography>
          </Box>
        </Box>
      </Grid>


      <Grid container size={12}>
        <Grid size={{ xs: 12, md: 4, lg: 4 }}>
          <Controller
            name={`module.${index}.monthlyAmount`}
            control={control}
            rules={{ required: true }}
            render={({ field }) => (
              <NumericFormat
                fullWidth
                customInput={TextField}
                prefix='R$ '
                thousandSeparator='.'
                decimalSeparator=','
                decimalScale={2}
                fixedDecimalScale
                allowNegative={false}
                size='small'
                type='tel'
                autoComplete='off'
                label='Valor mensal'
                value={field.value ?? ''}
                error={!!errors?.monthlyAmount}
                helperText={errors?.monthlyAmount?.message}
                onValueChange={({ floatValue }) => {
                  field.onChange(floatValue ?? null);
                }}
              />
            )}
          />
        </Grid>

        <Grid size={3}>
          <LocalizationProvider
            dateAdapter={AdapterDateFns}
            adapterLocale={ptBR}
          >
            <Controller
              name={`module.${index}.testDueDate`}
              control={control}
              render={({ field, fieldState }) => (
                <DatePicker
                  disabled={!!subscriptionId}
                  label='Vencimento do teste'
                  value={field.value ? field.value.toDate() : null}
                  onChange={(date) =>
                    field.onChange(date ? Timestamp.fromDate(date) : null)
                  }
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                      error: !!fieldState.error,
                      helperText: fieldState.error?.message,
                    },
                  }}
                />
              )}
            />
          </LocalizationProvider>
        </Grid>


        <Grid size={12} pl={0.5}>
          <Controller
            name={`module.${index}.enabled`}
            control={control}
            render={({ field }) => (
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        field.onChange(checked);

                        if (!checked) {
                          setValue(`module.${index}.testDueDate`, null);
                        } else {
                          const days = getValues(`module.${index}.testDays`) || 0;
                          const baseDate = new Date();
                          baseDate.setDate(baseDate.getDate() + days);

                          setValue(
                            `module.${index}.testDueDate`,
                            Timestamp.fromDate(baseDate),
                            { shouldValidate: true }
                          );
                          // Resetando subscriptionInactivated quando reativando o módulo
                          setValue(`module.${index}.subscriptionInactivated`, false);
                        }
                      }}
                    />
                  }
                  label='Ativo'
                />
                {errors.status && (
                  <Typography variant='caption' color='error'>
                    {errors.status.message}
                  </Typography>
                )}
              </FormGroup>
            )}
          />
        </Grid>
      </Grid >
    </Grid >
  );
}