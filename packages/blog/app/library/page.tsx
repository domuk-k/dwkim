import { type Book, allBooks } from '@/.contentlayer/generated';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function Library() {
  return (
    <div>
      {allBooks.map((book) => (
        <BookCard key={book._id} book={book} />
      ))}
    </div>
  );
}

function BookCard({ book }: { book: Book }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{book.title}</CardTitle>
        <CardDescription>{book.author}</CardDescription>
      </CardHeader>
      <CardContent>
        <p>{book?.description}</p>
      </CardContent>
      <CardFooter className="text-xs">{book?.isbn}</CardFooter>
    </Card>
  );
}
