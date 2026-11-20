import { useState, type FormEvent } from 'react';
import { api } from '../../shared/api/http';
import type { StoreQuestion, StoreReview } from '../../shared/api/contracts';
import { dateTime, useQuery } from '../../shared/api/useQuery';
import { PageState } from '../../shared/ui/molecules/Common';

export function MessagesPage() {
  const [tab, setTab] = useState<'questions' | 'reviews'>('questions');
  const qQuery = useQuery<StoreQuestion[]>('/questions');
  const rQuery = useQuery<StoreReview[]>('/reviews');
  const [replyMap, setReplyMap] = useState<Record<number, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const sendAnswer = async (e: FormEvent, questionId: number) => {
    e.preventDefault();
    const answerText = (replyMap[questionId] ?? '').trim();
    if (!answerText) return;
    setMsg(null);
    try {
      await api(`/questions/${questionId}/answer`, { method: 'POST', body: { answer_text: answerText } });
      setMsg('Respuesta publicada correctamente');
      qQuery.reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'No se pudo responder');
    }
  };

  const sendReviewReply = async (e: FormEvent, reviewId: number) => {
    e.preventDefault();
    const sellerReply = (replyMap[reviewId] ?? '').trim();
    if (!sellerReply) return;
    setMsg(null);
    try {
      await api(`/reviews/${reviewId}/reply`, { method: 'POST', body: { seller_reply: sellerReply } });
      setMsg('Respuesta a la reseña publicada');
      rQuery.reload();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'No se pudo responder');
    }
  };

  return (
    <>
      <h1>Preguntas y Reseñas de Clientes</h1>
      <div className="tabs" style={{ marginBottom: '1rem' }}>
        <button className={`tab ${tab === 'questions' ? 'is-active' : ''}`} onClick={() => setTab('questions')}>
          Preguntas Q&amp;A ({qQuery.data?.filter((q) => q.status === 'pending').length ?? 0} pendientes)
        </button>
        <button className={`tab ${tab === 'reviews' ? 'is-active' : ''}`} onClick={() => setTab('reviews')}>
          Reseñas verificadas ({rQuery.data?.length ?? 0})
        </button>
      </div>
      {msg && <p className="notice" role="status">{msg}</p>}

      {tab === 'questions' ? (
        <PageState loading={qQuery.loading} error={qQuery.error}>
          <div className="stack">
            {(qQuery.data ?? []).length === 0 && <p className="muted card">Aún no hay preguntas de clientes.</p>}
            {(qQuery.data ?? []).map((q) => (
              <article key={q.question_id} className="card form">
                <div className="head">
                  <strong>{q.product_name ?? `Producto #${q.product_id}`}</strong>
                  <span className={`pill ${q.status === 'pending' ? 'pill--pendiente' : 'pill--entregado'}`}>
                    {q.status === 'pending' ? 'Pendiente' : 'Respondida'}
                  </span>
                </div>
                <p style={{ margin: 0 }}>
                  <strong>{q.customer_name}:</strong> {q.question_text}
                </p>
                <small className="muted">{dateTime(q.created_at)}</small>
                {q.answer_text ? (
                  <p className="notice" style={{ margin: 0 }}>
                    <strong>Tu respuesta:</strong> {q.answer_text}
                  </p>
                ) : (
                  <form className="row" onSubmit={(e) => void sendAnswer(e, q.question_id)}>
                    <input
                      required
                      minLength={2}
                      placeholder="Escribe tu respuesta al cliente..."
                      value={replyMap[q.question_id] ?? ''}
                      onChange={(e) => setReplyMap((p) => ({ ...p, [q.question_id]: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                    <button className="btn btn--primary btn--sm">Responder</button>
                  </form>
                )}
              </article>
            ))}
          </div>
        </PageState>
      ) : (
        <PageState loading={rQuery.loading} error={rQuery.error}>
          <div className="stack">
            {(rQuery.data ?? []).length === 0 && <p className="muted card">Aún no has recibido reseñas.</p>}
            {(rQuery.data ?? []).map((r) => (
              <article key={r.review_id} className="card form">
                <div className="head">
                  <strong>{r.product_name ?? `Producto #${r.product_id}`}</strong>
                  <span className="pill pill--entregado">
                    Producto: {r.product_rating}/5 ★ · Atención: {r.seller_rating}/5 ★
                  </span>
                </div>
                <p style={{ margin: 0 }}>
                  <strong>{r.reviewer_name}:</strong> {r.title ? `${r.title} — ` : ''}{r.comment}
                </p>
                <small className="muted">{dateTime(r.created_at)}</small>
                {r.seller_reply ? (
                  <p className="notice" style={{ margin: 0 }}>
                    <strong>Tu respuesta:</strong> {r.seller_reply}
                  </p>
                ) : (
                  <form className="row" onSubmit={(e) => void sendReviewReply(e, r.review_id)}>
                    <input
                      required
                      minLength={2}
                      placeholder="Agradece o responde la reseña del comprador..."
                      value={replyMap[r.review_id] ?? ''}
                      onChange={(e) => setReplyMap((p) => ({ ...p, [r.review_id]: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                    <button className="btn btn--primary btn--sm">Publicar respuesta</button>
                  </form>
                )}
              </article>
            ))}
          </div>
        </PageState>
      )}
    </>
  );
}
