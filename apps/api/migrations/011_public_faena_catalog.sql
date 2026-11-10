-- Public reference data is intentionally separate from tenant organizations/sites.
-- These records do not grant access to operational data or imply a customer relationship.
CREATE TABLE reference_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL UNIQUE,
  official_source_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE faena_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES reference_companies(id),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  region text NOT NULL,
  commune text,
  operation_type text NOT NULL,
  summary text NOT NULL,
  official_source_url text NOT NULL,
  display_order integer NOT NULL CHECK (display_order > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, name)
);

CREATE TABLE reference_commodities (
  code text PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE faena_reference_commodities (
  faena_id uuid NOT NULL REFERENCES faena_references(id) ON DELETE CASCADE,
  commodity_code text NOT NULL REFERENCES reference_commodities(code),
  PRIMARY KEY (faena_id, commodity_code)
);

CREATE TABLE faena_reference_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faena_id uuid NOT NULL REFERENCES faena_references(id) ON DELETE CASCADE,
  asset_path text NOT NULL CHECK (asset_path LIKE '/assets/faenas/%' OR asset_path LIKE '/assets/faena-%'),
  alt_text text NOT NULL,
  caption text NOT NULL,
  credit text NOT NULL,
  license_name text NOT NULL,
  license_url text,
  source_url text NOT NULL,
  is_cover boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX faena_reference_one_cover
  ON faena_reference_media(faena_id) WHERE is_cover;
CREATE INDEX faena_reference_company_order
  ON faena_references(company_id, display_order);
CREATE INDEX faena_reference_region
  ON faena_references(region, display_order);

INSERT INTO reference_companies(display_name, official_source_url) VALUES
  ('Codelco', 'https://www.codelco.com/operaciones'),
  ('BHP', 'https://www.bhp.com/news/image-gallery/our-operations'),
  ('Antofagasta Minerals', 'https://www.aminerals.cl/nosotros/que-hacemos/nuestras-companias'),
  ('Collahuasi', 'https://www.collahuasi.cl/que-hacemos/nuestra-operacion/'),
  ('Teck', 'https://www.teck.com/operations-es/chile-es/operaciones-es/quebrada-blanca-es/'),
  ('Sierra Gorda SCM', 'https://kghm.com/en/our-business/mining-and-enrichment/sierra-gorda'),
  ('Minera El Abra', 'https://www.elabra.cl/'),
  ('Capstone Copper', 'https://capstonecopper.com/operations/mantos-blancos/'),
  ('Lundin Mining', 'https://www.lundinmining.com/our-portfolio/operations/candelaria/'),
  ('SQM', 'https://www.sqm.com/lineas-de-negocios/nuestras-faenas/'),
  ('Albemarle', 'https://www.albemarle.com/us/en/global-locations/chile');

INSERT INTO faena_references(company_id, slug, name, region, commune, operation_type, summary, official_source_url, display_order)
SELECT c.id, d.slug, d.name, d.region, d.commune, d.operation_type, d.summary, d.source_url, d.display_order
FROM (VALUES
  ('Codelco','chuquicamata','Chuquicamata','Antofagasta','Calama','Mina a rajo abierto','División minera de Codelco ubicada en el distrito de Calama.','https://www.codelco.com/operaciones',1),
  ('Codelco','radomiro-tomic','Radomiro Tomic','Antofagasta','Calama','Mina a rajo abierto','Operación cuprífera de Codelco en la Región de Antofagasta.','https://www.codelco.com/operaciones',2),
  ('Codelco','ministro-hales','Ministro Hales','Antofagasta','Calama','Mina a rajo abierto','División de Codelco con operación minera en el distrito de Calama.','https://www.codelco.com/operaciones',3),
  ('Codelco','gabriela-mistral','Gabriela Mistral','Antofagasta',NULL,'Mina a rajo abierto','División minera de Codelco en el norte de Chile.','https://www.codelco.com/operaciones',4),
  ('Codelco','salvador','Salvador','Atacama','Diego de Almagro','Mina subterránea y a rajo abierto','División de Codelco con faenas mineras en Diego de Almagro y proyectos de continuidad operacional.','https://www.codelco.com/operaciones/salvador/salvador',5),
  ('Codelco','andina','Andina','Valparaíso','Los Andes','División minera de montaña','División minera de Codelco ubicada en la zona cordillerana de la Región de Valparaíso.','https://www.codelco.com/operaciones',6),
  ('Codelco','el-teniente','El Teniente','O’Higgins','Machalí','Mina subterránea','División minera subterránea de Codelco en la Región de O’Higgins.','https://www.codelco.com/operaciones',7),
  ('BHP','escondida','Escondida','Antofagasta',NULL,'Complejo minero de cobre','Operación minera de cobre de BHP en el norte de Chile.','https://www.bhp.com/news/image-gallery/our-operations',8),
  ('Antofagasta Minerals','los-pelambres','Los Pelambres','Coquimbo','Salamanca','Mina y plantas de proceso','Operación cuprífera de Antofagasta Minerals ubicada en la Provincia del Choapa.','https://www.aminerals.cl/nosotros/que-hacemos/nuestras-companias',9),
  ('Antofagasta Minerals','centinela','Centinela','Antofagasta','Sierra Gorda','Complejo minero de cobre','Operación de Antofagasta Minerals ubicada en la Región de Antofagasta.','https://www.aminerals.cl/nosotros/que-hacemos/nuestras-companias',10),
  ('Antofagasta Minerals','zaldivar','Zaldívar','Antofagasta',NULL,'Mina a rajo abierto','Mina de cobre a rajo abierto operada por Antofagasta Minerals.','https://www.aminerals.cl/nosotros/que-hacemos/nuestras-companias',11),
  ('Collahuasi','collahuasi','Collahuasi','Tarapacá','Pica','Mina a rajo abierto','Operación de cobre con yacimientos en la comuna de Pica.','https://www.collahuasi.cl/que-hacemos/nuestra-operacion/',12),
  ('Teck','quebrada-blanca','Quebrada Blanca','Tarapacá','Pica','Complejo minero de cobre','Operación minera de Teck ubicada en la comuna de Pica.','https://www.teck.com/operations-es/chile-es/operaciones-es/quebrada-blanca-es/',13),
  ('Sierra Gorda SCM','sierra-gorda','Sierra Gorda','Antofagasta','Sierra Gorda','Mina a rajo abierto','Operación minera de cobre y molibdeno en la Región de Antofagasta.','https://kghm.com/en/our-business/mining-and-enrichment/sierra-gorda',14),
  ('Minera El Abra','el-abra','El Abra','Antofagasta','Calama','Mina a rajo abierto','Operación cuprífera ubicada al noreste de Calama.','https://www.elabra.cl/',15),
  ('Capstone Copper','mantos-blancos','Mantos Blancos','Antofagasta','Antofagasta','Mina de cobre','Operación minera ubicada en la Región de Antofagasta.','https://capstonecopper.com/operations/mantos-blancos/',16),
  ('Lundin Mining','candelaria','Candelaria','Atacama','Tierra Amarilla','Complejo minero de cobre','Complejo minero de cobre con instalaciones a rajo abierto y subterráneas. La imagen muestra infraestructura portuaria vinculada.','https://www.lundinmining.com/our-portfolio/operations/candelaria/',17),
  ('SQM','sqm-salar-atacama','Salar de Atacama · SQM','Antofagasta','San Pedro de Atacama','Faena de litio y potasio','Instalaciones de SQM en el Salar de Atacama para el procesamiento de salmueras y sales.','https://www.sqm.com/lineas-de-negocios/nuestras-faenas/',18),
  ('Albemarle','albemarle-salar-atacama','Salar de Atacama · Albemarle','Antofagasta','San Pedro de Atacama','Faena de litio','Faena de Albemarle en el Salar de Atacama; la salmuera se procesa en piscinas de evaporación.','https://www.albemarle.com/us/en/global-locations/chile',19)
) AS d(company_name, slug, name, region, commune, operation_type, summary, source_url, display_order)
JOIN reference_companies c ON c.display_name = d.company_name;

INSERT INTO reference_commodities(code, name) VALUES
  ('cobre','Cobre'), ('molibdeno','Molibdeno'), ('oro','Oro'),
  ('plata','Plata'), ('litio','Litio'), ('potasio','Potasio');

INSERT INTO faena_reference_commodities(faena_id, commodity_code)
SELECT f.id, d.commodity_code
FROM (VALUES
  ('chuquicamata','cobre'),('radomiro-tomic','cobre'),('ministro-hales','cobre'),
  ('gabriela-mistral','cobre'),('salvador','cobre'),('salvador','molibdeno'),
  ('andina','cobre'),('el-teniente','cobre'),('escondida','cobre'),
  ('los-pelambres','cobre'),('los-pelambres','molibdeno'),
  ('centinela','cobre'),('centinela','molibdeno'),('centinela','oro'),
  ('zaldivar','cobre'),('collahuasi','cobre'),('collahuasi','molibdeno'),
  ('quebrada-blanca','cobre'),('sierra-gorda','cobre'),('sierra-gorda','molibdeno'),
  ('el-abra','cobre'),('mantos-blancos','cobre'),('candelaria','cobre'),
  ('candelaria','oro'),('candelaria','plata'),
  ('sqm-salar-atacama','litio'),('sqm-salar-atacama','potasio'),
  ('albemarle-salar-atacama','litio')
) AS d(slug, commodity_code)
JOIN faena_references f ON f.slug = d.slug;

INSERT INTO faena_reference_media(faena_id, asset_path, alt_text, caption, credit, license_name, license_url, source_url, is_cover)
SELECT f.id, d.asset_path, d.alt_text, d.caption, d.credit, d.license_name, d.license_url, d.source_url, true
FROM (VALUES
  ('chuquicamata','/assets/faenas/faena-chuquicamata.jpg','Vista de la mina de Chuquicamata, Calama.','Mina de Chuquicamata, Calama.','Diego Delso','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','https://commons.wikimedia.org/wiki/File:Mina_de_Chuquicamata,_Calama,_Chile,_2016-02-01,_DD_110-112_PAN.JPG'),
  ('radomiro-tomic','/assets/faenas/faena-radomiro-tomic.jpg','Vista de la mina Radomiro Tomic.','Operación Radomiro Tomic.','Manxuc','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','https://commons.wikimedia.org/wiki/File:Mina_Radomiro_Tomic.jpg'),
  ('ministro-hales','/assets/faenas/faena-ministro-hales.jpg','Visita de autoridades a la División Ministro Hales de Codelco.','División Ministro Hales.','Gobierno de Chile','CC BY 2.0','https://creativecommons.org/licenses/by/2.0/','https://commons.wikimedia.org/wiki/File:Presidenta_participa_en_la_inauguraci%C3%B3n_de_la_Divisi%C3%B3n_Ministro_Hales_de_Codelco_(24169469086).jpg'),
  ('gabriela-mistral','/assets/faenas/faena-gabriela-mistral.jpg','Vista de la División Gabriela Mistral durante una visita ministerial.','División Gabriela Mistral.','Ministerio de Minería','Dominio público','https://commons.wikimedia.org/wiki/Commons:Licensing#Public_domain','https://commons.wikimedia.org/wiki/File:MINISTRO_PROKURICA_VISITA_LA_DIVISI%C3%93N_GABRIELA_MISTRAL_DE_CODELCO_(28763210397).jpg'),
  ('salvador','/assets/faenas/faena-salvador.jpg','Vista del proyecto Rajo Inca en la División Salvador.','División Salvador; la imagen corresponde a una visita al proyecto Rajo Inca.','Ministerio de Minería','Dominio público','https://commons.wikimedia.org/wiki/Commons:Licensing#Public_domain','https://commons.wikimedia.org/wiki/File:VISITA_DE_MINISTRO_PROKURICA_A_RAJO_INCA_DE_DIVISI%C3%93N_SALVADOR,_DE_CODELCO._(44900364992).jpg'),
  ('andina','/assets/faenas/faena-andina.jpg','Vista panorámica de la División Andina de Codelco.','División Andina.','Javier Rubilar','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0/','https://commons.wikimedia.org/wiki/File:Panor%C3%A1mica_Divisi%C3%B3n_Andina_(Codelco_Chile).jpg'),
  ('el-teniente','/assets/faenas/faena-el-teniente.jpg','Imagen histórica de labores subterráneas en El Teniente.','Labor subterránea histórica de El Teniente.','J.S. Webb y T.W. Skinner','Dominio público','https://commons.wikimedia.org/wiki/Commons:Licensing#Public_domain','https://commons.wikimedia.org/wiki/File:El_Teniente_stope.jpg'),
  ('escondida','/assets/faenas/faena-escondida.jpg','Imagen satelital ASTER de la mina Escondida, Chile.','Vista satelital ASTER de Escondida.','NASA/METI/AIST/Japan Space Systems y U.S./Japan ASTER Science Team','Dominio público','https://commons.wikimedia.org/wiki/Commons:Licensing#Public_domain','https://commons.wikimedia.org/wiki/File:Escondida_Mine,_Chile_(ASTER).jpg'),
  ('los-pelambres','/assets/faenas/faena-los-pelambres-commons.jpg','Vista de la faena minera Los Pelambres en la Región de Coquimbo.','Minera Los Pelambres.','Nelson Pérez','CC BY-SA 3.0','https://creativecommons.org/licenses/by-sa/3.0/','https://commons.wikimedia.org/wiki/File:Minera_Los_Pelambres,_Regi%C3%B3n_de_Coquimbo,_Chile_-_panoramio_(4).jpg'),
  ('centinela','/assets/faenas/faena-centinela-commons.jpg','Vista de rajos del distrito minero Centinela.','Rajos del distrito minero Centinela.','Alexander Gerst','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0/','https://commons.wikimedia.org/wiki/File:Centinela_mining_district_open_pits.jpg'),
  ('zaldivar','/assets/faenas/faena-zaldivar.jpg','Vista de la faena minera Zaldívar.','Minera Zaldívar.','Municipalidad de Antofagasta','CC BY 2.0','https://creativecommons.org/licenses/by/2.0/','https://commons.wikimedia.org/wiki/File:Antofagasta_-_Minera_Zaldivar_(5204144854).jpg'),
  ('collahuasi','/assets/faenas/faena-collahuasi-commons.jpg','Vista de la mina Collahuasi en el altiplano de Tarapacá.','Mina de Collahuasi.','Diego Delso','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','https://commons.wikimedia.org/wiki/File:Mina_de_Collahuasi,_Chile,_2016-02-10,_DD_29.JPG'),
  ('quebrada-blanca','/assets/faena-quebrada-blanca.jpg','Vista panorámica del acopio y las plantas de Quebrada Blanca.','Panorámica del área de acopio y plantas.','Teck','Fotografía de kit de prensa de Teck; licencia abierta no indicada',NULL,'https://www.teck.com/operations/chile/operations/quebrada-blanca/QBmedia/'),
  ('sierra-gorda','/assets/faenas/faena-sierra-gorda.jpg','Vista de la mina Sierra Gorda.','Mina Sierra Gorda.','Manxuc','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','https://commons.wikimedia.org/wiki/File:Mina_Sierra_Gorda.jpg'),
  ('el-abra','/assets/faenas/faena-el-abra.jpg','Visita ministerial a la faena Minera El Abra.','Minera El Abra.','Ministerio de Minería','Dominio público','https://commons.wikimedia.org/wiki/Commons:Licensing#Public_domain','https://commons.wikimedia.org/wiki/File:MINISTRO_PROKURICA_VISITA_MINERA_EL_ABRA_DESPU%C3%89S_DE_EMERGENCIA_POR_INVIERNO_ALTIPL%C3%81NICO_(50427367613).jpg'),
  ('mantos-blancos','/assets/faenas/faena-mantos-blancos.jpg','Vista aérea de la mina Mantos Blancos, Antofagasta.','Mina Mantos Blancos.','Chris Hunkeler','CC BY-SA 2.0','https://creativecommons.org/licenses/by-sa/2.0/','https://commons.wikimedia.org/wiki/File:Mantos_Copper_Mine_(32440311968).jpg'),
  ('candelaria','/assets/faenas/faena-punta-padrones.jpg','Muelle de embarque Puerto Punta Padrones, vinculado al complejo Candelaria.','La imagen muestra el Puerto Punta Padrones asociado a la operación Candelaria, no el rajo de la mina.','Carlos Teixidor Cadenas','CC BY-SA 4.0','https://creativecommons.org/licenses/by-sa/4.0/','https://commons.wikimedia.org/wiki/File:Muelle_Candelaria._Puerto_Punta_Padrones._Caldera_(Chile).jpg'),
  ('sqm-salar-atacama','/assets/faenas/faena-salar-atacama.jpg','Imagen satelital ASTER del Salar de Atacama.','Vista satelital del salar; referencia territorial de la faena, no de una instalación específica.','NASA/METI/AIST/Japan Space Systems y U.S./Japan ASTER Science Team','Dominio público','https://commons.wikimedia.org/wiki/Commons:Licensing#Public_domain','https://commons.wikimedia.org/wiki/File:Salar_de_Atacama,_Chile_(ASTER).jpg'),
  ('albemarle-salar-atacama','/assets/faenas/faena-salar-atacama.jpg','Imagen satelital ASTER del Salar de Atacama.','Vista satelital del salar; referencia territorial de la faena, no de una instalación específica.','NASA/METI/AIST/Japan Space Systems y U.S./Japan ASTER Science Team','Dominio público','https://commons.wikimedia.org/wiki/Commons:Licensing#Public_domain','https://commons.wikimedia.org/wiki/File:Salar_de_Atacama,_Chile_(ASTER).jpg')
) AS d(slug, asset_path, alt_text, caption, credit, license_name, license_url, source_url)
JOIN faena_references f ON f.slug = d.slug;
