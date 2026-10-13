-- Verified feasibility snapshots only; this does not perform live FAA ingestion.
insert into public.documents(id,authority,document_type,document_number,title,is_published)
values ('10000000-0000-4000-8000-000000000001','FAA','TCDS','2A13','TCDS 2A13',true) on conflict do nothing;
insert into public.document_versions(id,document_id,source_version_id,revision_label,revision_date,status,source_url,retrieved_at,metadata,is_published)
values ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','DRSDOCID125895332520251113164724.0001','66','2025-10-10','current','https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID125895332520251113164724.0001','2026-10-13T01:25:27.516Z','{"model":"PA-28-140 | PA-28-150 | PA-28-151 | PA-28-160 | PA-28-161 | PA-28-180 | PA-28-181 | PA-28-201T | PA-28-235 | PA-28-236 | PA-28R-180 | PA-28R-200 | PA-28R-201 | PA-28R-201T | PA-28RT-201 | PA-28RT-201T | PA-28S-160 | PA-28S-180","holder":"Piper Aircraft Inc.","product_type":"Aircraft"}'::jsonb,true) on conflict do nothing;
update public.documents set current_version_id='20000000-0000-4000-8000-000000000001' where id='10000000-0000-4000-8000-000000000001';

insert into public.documents(id,authority,document_type,document_number,title,is_published)
values ('10000000-0000-4000-8000-000000000002','FAA','TCDS','E7CE','TCDS E7CE',true) on conflict do nothing;
insert into public.document_versions(id,document_id,source_version_id,revision_label,revision_date,status,source_url,retrieved_at,metadata,is_published)
values ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','DRSDOCID148994589720230223190439.0001','21','2023-02-23','current','https://drs.faa.gov/browse/excelExternalWindow/DRSDOCID148994589720230223190439.0001','2026-10-13T01:25:31.252Z','{"model":"GTSIO-520-C | GTSIO-520-D | GTSIO-520-E | GTSIO-520-F | GTSIO-520-H | GTSIO-520-K | GTSIO-520-L | GTSIO-520-M | GTSIO-520-N | GTSIO-520-S","holder":"Continental Aerospace Technologies, Inc.","product_type":"Engine"}'::jsonb,true) on conflict do nothing;
update public.documents set current_version_id='20000000-0000-4000-8000-000000000002' where id='10000000-0000-4000-8000-000000000002';

insert into public.documents(id,authority,document_type,document_number,title,is_published)
values ('10000000-0000-4000-8000-000000000003','FAA','TCDS','P19NE','TCDS P19NE',true) on conflict do nothing;
insert into public.document_versions(id,document_id,source_version_id,revision_label,revision_date,status,source_url,retrieved_at,metadata,is_published)
values ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','65F15764601662218625870C00615523.0001','8','2021-07-08','current','https://drs.faa.gov/browse/excelExternalWindow/65F15764601662218625870C00615523.0001','2026-10-13T01:25:34.427Z','{"model":"MTV-6-( )","holder":"MT-Propeller Entwicklung GmbH","product_type":"Propeller"}'::jsonb,true) on conflict do nothing;
update public.documents set current_version_id='20000000-0000-4000-8000-000000000003' where id='10000000-0000-4000-8000-000000000003';
