-- Z51: the issued tax document (invoice) the client uploads to a reservation. The client issues it by hand in their own
-- tool from our "podklad na doklad"; the guest sees it in the stay under "Doklady". Only adds a column.

alter table public.documents
  add column kind text not null default 'document'
    check (kind in ('document', 'invoice'));

-- An invoice belongs to one reservation (not to a property).
alter table public.documents
  add constraint documents_invoice_reservation check (kind <> 'invoice' or reservation_id is not null);

create index documents_invoice_idx on public.documents (reservation_id) where kind = 'invoice';

comment on column public.documents.kind is
  'document = file for guests (B10); invoice = issued tax document of the reservation (Z51), shown to the guest under Doklady.';
