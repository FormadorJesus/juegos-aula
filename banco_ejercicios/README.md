# Banco de Ejercicios Matemáticos

Aplicación y servicio conectable para que cualquier juego de `FormadorJesus/juegos-aula` (o externo) solicite ejercicios de operaciones y problemas con **4 respuestas posibles (tipo test)**.

## Cobertura curricular

- **Temas (`tema` / `temas`)**: `enteros`, `fracciones`, `potencias`, `ecuaciones`, `funciones`, `mixto`
- **Niveles (`nivel`)**: `1eso`, `2eso`, `3eso`, `4eso`, `1bach`, `2bach`
- **Modalidades (`tipo`)**: `operacion`, `problema`, `mixto`

## Conexión rápida desde un juego

```html
<script src="../banco_ejercicios/client.js"></script>
<script>
  // Solicitar un ejercicio concreto
  const ejercicio = await BancoMathClient.solicitarEjercicio({
    tema: 'ecuaciones',
    nivel: '3eso',
    tipo: 'problema'
  });

  // Solicitar un lote siguiendo la configuración activa fijada por el profesor
  const lote = await BancoMathClient.solicitarLote({
    usarConfiguracionAula: true,
    cantidad: 10,
    origen: 'MiJuego'
  });
</script>
```

## Formato de cada ejercicio devuelto

```json
{
  "id": "ecuaciones-3eso-problema-...",
  "tema": "ecuaciones",
  "temaLabel": "Ecuaciones",
  "nivel": "3eso",
  "nivelLabel": "3.º ESO",
  "tipo": "problema",
  "tipoLabel": "Problema",
  "enunciado": "Dos números naturales suman 14 y su producto es 33. ¿Cuál es el mayor de los dos números?",
  "opciones": ["3", "11", "10", "13"],
  "respuestaCorrecta": "11",
  "indiceCorrecto": 1,
  "explicacion": "Resolvemos x² − 14x + 33 = 0 ⇒ soluciones 3 y 11. El mayor es 11.",
  "tiempoSugerido": 44,
  "etiquetas": ["problema-cuadratica", "suma-producto"]
}
```
