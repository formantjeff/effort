-- Update effort_graphs.updated_at when workstreams change
-- This ensures the timestamp changes with any workstream edits

CREATE OR REPLACE FUNCTION update_graph_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE effort_graphs
  SET updated_at = NOW()
  WHERE id = NEW.graph_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on workstream INSERT, UPDATE, DELETE
CREATE TRIGGER update_graph_on_workstream_insert
  AFTER INSERT ON workstreams
  FOR EACH ROW
  EXECUTE FUNCTION update_graph_updated_at();

CREATE TRIGGER update_graph_on_workstream_update
  AFTER UPDATE ON workstreams
  FOR EACH ROW
  EXECUTE FUNCTION update_graph_updated_at();

CREATE TRIGGER update_graph_on_workstream_delete
  AFTER DELETE ON workstreams
  FOR EACH ROW
  EXECUTE FUNCTION update_graph_updated_at();
