import { Injectable } from "@nestjs/common";
import { PoolClient } from "pg";

@Injectable()
export class FaenaCatalogRepository {
  async list(c: PoolClient) {
    return (
      await c.query(
        `SELECT f.id,f.slug,f.name,c.display_name AS "operatorName",
          c.official_source_url AS "operatorSourceUrl",
          f.region,f.commune,f.operation_type AS "operationType",f.summary AS description,
          f.official_source_url AS "officialSourceUrl",
          COALESCE((SELECT array_agg(rc.name ORDER BY rc.name)
            FROM faena_reference_commodities frc
            JOIN reference_commodities rc ON rc.code=frc.commodity_code
            WHERE frc.faena_id=f.id),'{}') AS commodities,
          m.asset_path AS image,m.alt_text AS "imageAlt",m.caption AS "imageCaption",
          m.credit AS "photoCredit",m.license_name AS "photoLicense",
          m.license_url AS "photoLicenseUrl",m.source_url AS "photoSourceUrl"
        FROM faena_references f
        JOIN reference_companies c ON c.id=f.company_id
        LEFT JOIN faena_reference_media m ON m.faena_id=f.id AND m.is_cover
        ORDER BY f.display_order,f.name`,
      )
    ).rows;
  }
}
