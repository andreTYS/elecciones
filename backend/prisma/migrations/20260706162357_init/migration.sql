-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('SUPER_ADMIN', 'ADMIN_MORTAL', 'COORDINADOR', 'PERSONERO');

-- CreateEnum
CREATE TYPE "EstadoOCR" AS ENUM ('PENDIENTE', 'PROCESANDO', 'COMPLETADO', 'ERROR', 'REQUIERE_REVISION');

-- CreateEnum
CREATE TYPE "Severidad" AS ENUM ('ALTA', 'MEDIA', 'BAJA');

-- CreateTable
CREATE TABLE "Region" (
    "id" SERIAL NOT NULL,
    "ubigeo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provincia" (
    "id" SERIAL NOT NULL,
    "ubigeo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "regionId" INTEGER NOT NULL,

    CONSTRAINT "Provincia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Distrito" (
    "id" SERIAL NOT NULL,
    "ubigeo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "provinciaId" INTEGER NOT NULL,

    CONSTRAINT "Distrito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CentroVotacion" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT,
    "totalMesas" INTEGER NOT NULL DEFAULT 0,
    "distritoId" INTEGER NOT NULL,
    "coordinadorId" INTEGER,

    CONSTRAINT "CentroVotacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mesa" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "centroVotacionId" INTEGER NOT NULL,
    "personeroId" INTEGER,
    "estadoInstalada" BOOLEAN,
    "horaConfirmacion" TIMESTAMP(3),

    CONSTRAINT "Mesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "dni" TEXT,
    "email" TEXT,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'PERSONERO',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "colorPartido" TEXT,
    "numeroPartido" INTEGER,
    "distritoId" INTEGER,
    "supervisorId" INTEGER,
    "modulosPermitidos" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sesion" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "ip" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidato" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "agrupacion" TEXT NOT NULL,
    "numero" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '1B3A6B',
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Candidato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Acta" (
    "id" SERIAL NOT NULL,
    "mesaId" INTEGER NOT NULL,
    "personeroId" INTEGER NOT NULL,
    "imagenUrl" TEXT NOT NULL,
    "imagenHash" TEXT,
    "estadoOCR" "EstadoOCR" NOT NULL DEFAULT 'PENDIENTE',
    "confianzaOCR" DOUBLE PRECISION,
    "observaciones" TEXT,
    "votosNulos" INTEGER NOT NULL DEFAULT 0,
    "votosBlancos" INTEGER NOT NULL DEFAULT 0,
    "totalVotantes" INTEGER NOT NULL DEFAULT 0,
    "confirmada" BOOLEAN NOT NULL DEFAULT false,
    "confirmadaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Acta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VotoActa" (
    "id" SERIAL NOT NULL,
    "actaId" INTEGER NOT NULL,
    "candidatoId" INTEGER NOT NULL,
    "votos" INTEGER NOT NULL DEFAULT 0,
    "confianza" TEXT NOT NULL DEFAULT 'alta',

    CONSTRAINT "VotoActa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incidencia" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "severidad" "Severidad" NOT NULL DEFAULT 'MEDIA',
    "personeroId" INTEGER NOT NULL,
    "coordinadorId" INTEGER,
    "resuelta" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alimentacion" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alimentacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificado" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "emitidoPor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfigSistema" (
    "id" SERIAL NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "ConfigSistema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alerta" (
    "id" SERIAL NOT NULL,
    "actaId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "resuelta" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Urgencia" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "emisorId" INTEGER NOT NULL,
    "resuelta" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Urgencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" INTEGER,
    "detalle" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Region_ubigeo_key" ON "Region"("ubigeo");

-- CreateIndex
CREATE UNIQUE INDEX "Provincia_ubigeo_key" ON "Provincia"("ubigeo");

-- CreateIndex
CREATE UNIQUE INDEX "Distrito_ubigeo_key" ON "Distrito"("ubigeo");

-- CreateIndex
CREATE UNIQUE INDEX "CentroVotacion_codigo_key" ON "CentroVotacion"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Mesa_numero_centroVotacionId_key" ON "Mesa"("numero", "centroVotacionId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Sesion_refreshToken_key" ON "Sesion"("refreshToken");

-- CreateIndex
CREATE UNIQUE INDEX "VotoActa_actaId_candidatoId_key" ON "VotoActa"("actaId", "candidatoId");

-- CreateIndex
CREATE UNIQUE INDEX "Alimentacion_userId_tipo_key" ON "Alimentacion"("userId", "tipo");

-- CreateIndex
CREATE UNIQUE INDEX "ConfigSistema_clave_key" ON "ConfigSistema"("clave");

-- AddForeignKey
ALTER TABLE "Provincia" ADD CONSTRAINT "Provincia_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Distrito" ADD CONSTRAINT "Distrito_provinciaId_fkey" FOREIGN KEY ("provinciaId") REFERENCES "Provincia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CentroVotacion" ADD CONSTRAINT "CentroVotacion_distritoId_fkey" FOREIGN KEY ("distritoId") REFERENCES "Distrito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CentroVotacion" ADD CONSTRAINT "CentroVotacion_coordinadorId_fkey" FOREIGN KEY ("coordinadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mesa" ADD CONSTRAINT "Mesa_centroVotacionId_fkey" FOREIGN KEY ("centroVotacionId") REFERENCES "CentroVotacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mesa" ADD CONSTRAINT "Mesa_personeroId_fkey" FOREIGN KEY ("personeroId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_distritoId_fkey" FOREIGN KEY ("distritoId") REFERENCES "Distrito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sesion" ADD CONSTRAINT "Sesion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acta" ADD CONSTRAINT "Acta_mesaId_fkey" FOREIGN KEY ("mesaId") REFERENCES "Mesa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acta" ADD CONSTRAINT "Acta_personeroId_fkey" FOREIGN KEY ("personeroId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotoActa" ADD CONSTRAINT "VotoActa_actaId_fkey" FOREIGN KEY ("actaId") REFERENCES "Acta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VotoActa" ADD CONSTRAINT "VotoActa_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_personeroId_fkey" FOREIGN KEY ("personeroId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incidencia" ADD CONSTRAINT "Incidencia_coordinadorId_fkey" FOREIGN KEY ("coordinadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alimentacion" ADD CONSTRAINT "Alimentacion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificado" ADD CONSTRAINT "Certificado_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alerta" ADD CONSTRAINT "Alerta_actaId_fkey" FOREIGN KEY ("actaId") REFERENCES "Acta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
