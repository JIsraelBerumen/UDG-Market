function notFound(req, res) {
  res.status(404).json({ error: 'No se encontró el recurso solicitado.' });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error.status === 404) {
    return res.status(404).json({ error: 'No se encontró el recurso solicitado.' });
  }
  if (error.status === 413) {
    return res.status(413).json({ error: 'La solicitud supera el tamaño máximo permitido.' });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El JSON de la solicitud no es válido.' });
  }
  if (Number.isInteger(error.statusCode) && error.statusCode >= 400 && error.statusCode < 500) {
    return res.status(error.statusCode).json({ error: error.message });
  }
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'El registro ya existe.' });
  }
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'La imagen supera el tamaño máximo permitido.' });
  }
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Solo se permite una imagen por solicitud.' });
  }
  if (error.message === 'Tipo de archivo no permitido.') {
    return res.status(415).json({ error: error.message });
  }

  console.error(error);
  res.status(500).json({ error: 'Ocurrió un error interno. Inténtalo más tarde.' });
}

module.exports = { errorHandler, notFound };
