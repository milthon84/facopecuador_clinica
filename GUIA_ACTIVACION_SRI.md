# Guía de Activación: Facturación Electrónica SRI

## Estado actual del sistema
El sistema está en **modo simulador**: genera XMLs válidos, claves de acceso reales y guarda facturas en la base de datos, pero **no se conecta todavía al SRI**. Esta guía describe los pasos para activarlo completamente.

---

## PASO 1 — Ejecutar migración en Supabase (OBLIGATORIO AHORA)

Este paso corrige la generación del número secuencial para que sea atómica y segura.

1. Ir a **Supabase Dashboard** → tu proyecto → **SQL Editor** → **New query**
2. Abrir el archivo `supabase/migration_invoice_sequence.sql` de este repositorio
3. Copiar todo el contenido y ejecutarlo
4. Verificar que no hay errores. Deberías ver mensajes de éxito.

> ✅ Después de este paso la facturación ya funciona correctamente en modo simulador.

---

## PASO 2 — Configurar los datos del emisor en la aplicación

1. Ingresar como administrador a la clínica
2. Ir a **Facturación → Configuración SRI**
3. Completar con los datos reales:
   - **RUC**: el RUC de 13 dígitos registrado en el SRI
   - **Razón Social**: exactamente como aparece en el RUC (mayúsculas)
   - **Nombre Comercial**: nombre público de la clínica (opcional)
   - **Establecimiento**: `001` (o el que corresponda según tu autorización SRI)
   - **Punto de Emisión**: `001`
   - **Dirección Matriz**: dirección fiscal registrada en el SRI
4. Dejar en **Ambiente de Pruebas** hasta completar las pruebas
5. Guardar

---

## PASO 3 — Pruebas en Ambiente de Pruebas

1. Emitir 5-10 facturas de prueba desde **Facturación → Emitir Factura**
2. Verificar que:
   - Se generan con número correlativo correcto (001-001-000000001, etc.)
   - La clave de acceso tiene 49 dígitos
   - Los totales calculan bien con IVA 15%

---

## PASO 4 — Obtener el Certificado de Firma Electrónica `.p12`

Para emitir facturas reales con validez legal, necesitas una **firma electrónica** emitida por una entidad autorizada por el SRI:

| Entidad | Web | Costo aprox. |
|---------|-----|-------------|
| BCE (Banco Central del Ecuador) | https://www.bce.fin.ec | $25/año |
| Security Data | https://www.securitydata.net.ec | $35/año |
| ANF AC Ecuador | https://www.anf.es/ecuador | $30/año |

**Qué solicitar:** Certificado de firma electrónica para **Persona Natural** o **Persona Jurídica** según corresponda. El resultado es un archivo `.p12` y una contraseña.

> ⚠️ Guarda el archivo `.p12` y la contraseña en un lugar muy seguro. Son equivalentes a tu firma física.

---

## PASO 5 — Integrar firma y envío real al SRI (desarrollo requerido)

Esta es la única parte que requiere trabajo de desarrollo adicional. Los servicios WSDL del SRI son:

**Ambiente de Pruebas:**
- Recepción: `https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl`
- Autorización: `https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl`

**Ambiente de Producción:**
- Recepción: `https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl`
- Autorización: `https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl`

**Librería recomendada para Node.js/Next.js:**
```bash
npm install node-forge xml-crypto
```

**Flujo de envío real:**
```
1. Tomar el XML generado (generarXMLFactura)
        ↓
2. Firmar el XML con el .p12 usando node-forge + xml-crypto
        ↓
3. Codificar el XML firmado en Base64
        ↓
4. Llamar al WSDL de Recepción con el XML en Base64
   → Si responde RECIBIDA: continuar
   → Si responde DEVUELTA: hay errores en el XML, revisar
        ↓
5. Esperar ~3 segundos y llamar al WSDL de Autorización con la clave de acceso
   → Si responde AUTORIZADO: guardar número de autorización y fecha
   → Si responde RECHAZADA: guardar mensajes de error en sri_error_messages
        ↓
6. Actualizar invoice en BD: sri_status = 'authorized', sri_authorization_number = <número real>
        ↓
7. Generar PDF RIDE y enviarlo al correo del cliente
```

---

## PASO 6 — Cambiar a Ambiente de Producción

Una vez que las pruebas con el SRI de pruebas funcionen:

1. Ir a **Configuración SRI** en la aplicación
2. Seleccionar **Ambiente de Producción**
3. Guardar

> ⚠️ A partir de este momento las facturas tienen validez legal. No emitas facturas de prueba en producción.

---

## Resumen de estado actual

| Funcionalidad | Estado |
|---------------|--------|
| Generación de XML SRI válido | ✅ Funcionando |
| Clave de acceso 49 dígitos (Módulo 11) | ✅ Funcionando |
| Secuencial atómico (sin duplicados) | ✅ Funcionando (requiere migración SQL) |
| Tipo de identificación correcto (RUC/Cédula/CF) | ✅ Funcionando |
| Subtotales No Objeto / Exento en XML | ✅ Funcionando |
| IVA 15% y 0% | ✅ Funcionando |
| Firma digital con .p12 | ⏳ Pendiente (Paso 5) |
| Envío real al WSDL SRI | ⏳ Pendiente (Paso 5) |
| Generación de PDF RIDE | ⏳ Pendiente |
| Envío por correo al cliente | ⏳ Pendiente |

---

*Última actualización: Mayo 2026*
