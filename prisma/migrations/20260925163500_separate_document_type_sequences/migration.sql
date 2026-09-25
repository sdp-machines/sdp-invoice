-- Allow the same formatted document number to exist once for a quotation
-- and once for an order form, while keeping each type unique.
DROP INDEX `Document_documentNumber_key` ON `Document`;

CREATE UNIQUE INDEX `Document_documentNumber_documentType_key`
ON `Document`(`documentNumber`, `documentType`);
