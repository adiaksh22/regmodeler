-- Correct paragraph labels and the enriched AD subject after final source cross-check.
-- Keep the already-applied review migration and evidence IDs intact.
do $correction$
declare definition text;
begin
 select pg_get_functiondef('public.review_pa28_batch4_graph()'::regprocedure) into definition;
 definition:=replace(definition,'Paragraph (g)(2) specifies SB 1279A for newly affected airplanes.','Paragraph (g)(1)(ii) specifies SB 1279A for newly affected airplanes.');
 definition:=replace(definition,'Paragraph (h) incorporates Piper Service Bulletin No. 1139A, April 9, 2004.','Paragraph (g) incorporates Piper Service Bulletin No. 1139A, April 9, 2004.');
 definition:=replace(definition,'The profile does not establish installed rudder configuration, inspection results or completed work.','The profile does not establish aft wing spar attachment configuration, inspection results or completed work.');
 execute definition;
end $correction$;
