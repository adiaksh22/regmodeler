-- Keep related-source discovery aligned with every approved variant in the reviewed A16WE slice.
insert into public.related_scope_models(source,model,source_model,model_entity_id)
select source,'737-7','737-7',e.id from (values('FAA:ADFRAWD:B737'),('FAA:STC:B737')) sources(source)
left join public.catalog_entities e on e.authority='FAA' and e.entity_type='aircraft_model' and e.natural_key='737-7'
on conflict(source,model) do update set source_model=excluded.source_model,model_entity_id=excluded.model_entity_id;
