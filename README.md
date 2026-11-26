# moneyagent

App de control de gastos en Next.js (se instala en el celular y funciona sin internet).

## Publicar en Vercel
1. Sube esta carpeta a un repositorio de GitHub.
2. En vercel.com → Create New → Project → importa el repositorio → Deploy.

## Configurar la venta
Edita `public/app.js`, al inicio:
- `precio`: lo que cobras.
- `linkDeCompra`: tu link de pago (Mercado Pago, Stripe, etc.), o
- `whatsapp`: tu número con lada (ej. 5215512345678) para que te escriban.

## Activar a un cliente
Genera su link en tu herramienta privada «Licencias moneyagent» y mándaselo.
La llave privada NUNCA va en este proyecto.
