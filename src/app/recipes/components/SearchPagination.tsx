import { css } from 'styled-system/css';

type SearchPaginationProps = {
    currentPage: number;
    totalPages: number;
    totalResults: number;
    startItem: number;
    endItem: number;
    canGoPrev: boolean;
    canGoNext: boolean;
    pageNumbers: number[];
    onPageChange: (page: number) => void;
};

export function SearchPagination({
    currentPage,
    totalPages,
    totalResults,
    startItem,
    endItem,
    canGoPrev,
    canGoNext,
    pageNumbers,
    onPageChange,
}: SearchPaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <div
            className={css({
                marginTop: '5',
                display: 'flex',
                flexDirection: 'column',
                gap: '3',
                alignItems: 'center',
            })}
        >
            <div
                className={css({
                    display: 'flex',
                    gap: '2',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignItems: 'center',
                })}
            >
                <button
                    type="button"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={!canGoPrev}
                    className={css({
                        px: '3',
                        py: '2',
                        borderRadius: 'lg',
                        border: '1px solid',
                        borderColor: canGoPrev ? 'primary' : 'light',
                        color: canGoPrev ? 'primary' : 'text-muted',
                        background: 'surface',
                        cursor: canGoPrev ? 'pointer' : 'not-allowed',
                        fontSize: 'sm',
                        fontWeight: '600',
                        minWidth: '80px',
                    })}
                >
                    Zur\u00fcck
                </button>

                <div className={css({ display: 'flex', gap: '1', alignItems: 'center' })}>
                    {pageNumbers.map((pageNumber) => {
                        const isActive = pageNumber === currentPage;
                        return (
                            <button
                                key={pageNumber}
                                type="button"
                                onClick={() => onPageChange(pageNumber)}
                                aria-current={isActive ? 'page' : undefined}
                                className={css({
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: 'md',
                                    border: '1px solid',
                                    borderColor: isActive ? 'primary' : 'light',
                                    background: isActive ? 'primary' : 'surface',
                                    color: isActive ? 'white' : 'text',
                                    fontWeight: '600',
                                    fontSize: 'sm',
                                    cursor: 'pointer',
                                })}
                            >
                                {pageNumber}
                            </button>
                        );
                    })}
                </div>

                <button
                    type="button"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={!canGoNext}
                    className={css({
                        px: '3',
                        py: '2',
                        borderRadius: 'lg',
                        border: '1px solid',
                        borderColor: canGoNext ? 'primary' : 'light',
                        color: canGoNext ? 'primary' : 'text-muted',
                        background: 'surface',
                        cursor: canGoNext ? 'pointer' : 'not-allowed',
                        fontSize: 'sm',
                        fontWeight: '600',
                        minWidth: '80px',
                    })}
                >
                    Weiter
                </button>
            </div>

            <p className={css({ fontSize: 'xs', color: 'text-muted' })}>
                Zeige {startItem}-{endItem} von {totalResults} Rezepten
            </p>
        </div>
    );
}
