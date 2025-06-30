import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import Typography from "@mui/material/Typography";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

function ReleaseNotes() {
  return (
    <>
      <Accordion className="bg-lightgreen">
        <AccordionSummary expandIcon={<ArrowDownwardIcon />} aria-controls="panel1-content" id="panel1-header">
          <Typography component="span">Release Notes</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Table
            size="small"
            sx={{
              "& .MuiTableCell-root": {
                border: "1px solid #ccc",
              },
            }}
          >
            <TableHead>
              <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                <TableCell>Version</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Typography>v2.0</Typography>
                </TableCell>
                <TableCell>
                  <Typography>May 2025</Typography>
                </TableCell>
                <TableCell>
                  <ul>
                    <li>Site moved from will-kelsey.com/circuitSolver to onlinecircuitsolver.com</li>
                    <li>
                      The user 'reactions' to the old site were: 27 angry, 3 laugh, 3 sad, 5 wow, 15 love and 29 superb. The angry people weren't leaving comments but I think the
                      reasons were:
                      <ul>
                        <li>It doesn't work on touch devices including ipad</li>
                        <li>It could crash, like when you drag one componenct directly on top of another</li>
                        <li>Limited features compared to industial tools</li>
                      </ul>
                      Now it works on touch because I developed visiojs (link). Also visiojs replaces draw2d which was the source of all the crashing.
                    </li>
                    <li>Moved to React + MUI + NPM. This allows: running lint, more maintainable code, smaller file size, many micro-benefits from joining the mainstream</li>
                    <li>As well as a re-write, the following new features are added:</li>
                    <ul>
                      <li>Adding 2 vprobes</li>
                    </ul>
                  </ul>
                  There is one open item I want to do, which is add Python SymPy. Currently the algebraic solver is Algebrite + Yaffle - and they do an amazing job to inverse and
                  simplify an algebraic matrix. However, SymPy can simplify better, and can swap out the algebra to make pretty numberic results
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </AccordionDetails>
      </Accordion>
    </>
  );
}

export default ReleaseNotes;
