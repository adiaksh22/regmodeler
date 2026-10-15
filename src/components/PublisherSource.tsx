export default function PublisherSource({conditions}:{conditions:Record<string,string>}) {
  const url=conditions.publisher_url;
  if(!/^https:\/\/s3[.]amazonaws[.]com\/pipercrm\/Solution\/\d+\/[A-Za-z0-9_ -]+[.]pdf$/.test(url??'')||!/^[a-f0-9]{64}$/.test(conditions.publisher_sha256??'')||!/^\d{4}-\d{2}-\d{2}$/.test(conditions.publisher_reviewed_date??''))return null;
  return <div className="border-t border-blue-200 mt-4 pt-3 text-sm"><a className="text-blue-700 underline" href={url} target="_blank" rel="noopener noreferrer">Open Piper bulletin PDF</a><p className="text-xs mt-2">Publisher file reviewed {conditions.publisher_reviewed_date}. {conditions.publisher_edition_note}</p></div>;
}
